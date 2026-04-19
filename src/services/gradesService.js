const prisma = require("../utils/prisma");
const { MANUAL_EXAM_TYPES, CALCULATED_EXAM_TYPES } = require("../utils/gradesValidate");
const { calculateAveragesIfNeeded } = require("./gradeCalculations");
const redis = require("../config/redis");


/**
 * @description create a new grade
 * @route POST /api/grades
 * @method POST
 * @access private (school admin, teacher)
 */
exports.createGradeService = async (gradeData, schoolId, userId, userRole) => {
    const { studentId, subjectId, academicYearId, examType, score, notes } = gradeData;

    // 1. Initial Validation
    if (CALCULATED_EXAM_TYPES.includes(examType)) {
        throw { statusCode: 400, message: "Cannot manually enter calculated grade types." };
    }
    if (!MANUAL_EXAM_TYPES.includes(examType)) {
        throw { statusCode: 400, message: "Invalid exam type" };
    }

    // 2. Fetch required resources in parallel for Performance (Optimization)
    const [academicYear, subject, student] = await Promise.all([
        prisma.academicYear.findFirst({
            where: { id: academicYearId, schoolId, isDeleted: false }
        }),
        prisma.subject.findFirst({
            where: { id: subjectId, class: { schoolId } },
            include: {
                class: { select: { id: true } },
                teacher: { select: { id: true } }
            }
        }),
        prisma.user.findFirst({
            where: { id: studentId, role: 'STUDENT', schoolId, isDeleted: false },
            select: { id: true, classId: true }
        })
    ]);

    // 3. Logic Validation
    if (!academicYear) throw { statusCode: 404, message: "Academic year not found or inactive" };
    if (!subject) throw { statusCode: 404, message: "Subject not found" };
    if (!student) throw { statusCode: 404, message: "Student not found" };

    // Teacher Permission Check
    if (userRole === 'TEACHER' && subject.teacherId !== userId) {
        throw { statusCode: 403, message: "Not authorized for this subject" };
    }

    // Student-Class Relation Check
    if (student.classId !== subject.class.id) {
        throw { statusCode: 400, message: "Student is not in the subject's class" };
    }

    // 4. Second Round Exam Specific Logic
    if (examType === 'SECOND_ROUND_EXAM') {
        const finalGrade = await prisma.grade.findFirst({
            where: {
                studentId, subjectId, academicYearId, examType: 'FINAL_GRADE'
            },
            select: { score: true }
        });

        if (!finalGrade) throw { statusCode: 400, message: "No Final Grade found. Cannot enter Second Round." };
        if (finalGrade.score >= 50) throw { statusCode: 400, message: "Student has already passed. Cannot enter Second Round." };
    }

    try {
        // 5. Create Grade & Calculate Averages (Atomic Transaction)
        const result = await prisma.$transaction(async (tx) => {
            // A. Create the Grade
            const newGrade = await tx.grade.create({
                data: {
                    score,
                    notes,
                    examType,
                    isCalculated: false,
                    studentId,
                    subjectId,
                    teacherId: userId,
                    academicYearId
                },
                select: {
                    id: true,
                    score: true,
                    examType: true,
                    isCalculated: true,
                    createdAt: true,
                    updatedAt: true,
                    studentId: true,
                    subjectId: true,
                    student: { select: { firstName: true, lastName: true } },
                    subject: { select: { name: true } },
                    academicYear: { select: { name: true } }
                }
            });

            // B. Calculate Averages
            await calculateAveragesIfNeeded(tx, studentId, subjectId, academicYearId, userId);
            // C. Invalidate Caches
            await redis.del(`school:${schoolId}:student:${studentId}:grades`);
            await redis.delByPattern(`school:${schoolId}:class:*:results*`);

            return newGrade;

        });

        return result;

    } catch (error) {
        // Handle Unique Constraint Violation (P2002)
        if (error.code === 'P2002') {
            throw { statusCode: 409, message: "Grade already exists for this exam type" };
        }
        throw error;
    }
};

/**
 * @description get grades of one student (defaults to current academic year, supports filtering)
 * @route GET /api/grades/student/:studentId?academicYearId=...
 * @method GET
 * @access private (school admin, assistant)
 */
exports.getGradesByStudentIdService = async (studentId, schoolId, userRole, academicYearId = null) => {
    // 1. check if the student belongs to the school
    const student = await prisma.user.findFirst({
        where: { id: studentId, role: 'STUDENT', schoolId, isDeleted: false },
        select: { id: true }
    });

    if (!student) {
        throw { statusCode: 404, message: "Student not found" };
    }

    if (userRole !== 'SCHOOL_ADMIN' && userRole !== 'ASSISTANT') {
        throw { statusCode: 403, message: "Not authorized to view all student grades" };
    }

    // 2. Determine which academic year to fetch
    // If academicYearId is provided, use it.
    // If NOT provided, find the "current" academic year for the school.
    let filterYearId = academicYearId;

    if (!filterYearId) {
        const currentYear = await prisma.academicYear.findFirst({
            where: { schoolId, isCurrent: true, isDeleted: false },
            select: { id: true }
        });
        if (currentYear) {
            filterYearId = currentYear.id;
        }
    }

    // 3. Prepare where clause
    const whereClause = { studentId };
    if (filterYearId) {
        whereClause.academicYearId = filterYearId;
    }

    // 4. get grades
    const grades = await prisma.grade.findMany({
        where: whereClause,
        select: {
            score: true,
            examType: true,
            subject: {
                select: { name: true }
            },
            academicYear: {
                select: { name: true }
            }
        },
        orderBy: [
            { academicYearId: 'asc' },
            { subjectId: 'asc' },
            { examType: 'asc' }
        ]
    });

    return grades;
};

/**
 * @description student can view his grades for the current academic year in all subjects
 * @route GET /api/grades/student/:studentId
 * @method GET
 * @access private (student only )
 */
exports.getStudentGradesService = async (studentId, schoolId, userRole) => {
    // 0. Check Redis Cache
    const cacheKey = `school:${schoolId}:student:${studentId}:grades`;
    try {
        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
    } catch (err) {
        console.error("Redis Get Error:", err);
    }

    // 1. Verifying the presence of student at school
    const student = await prisma.user.findFirst({
        where: { id: studentId, role: 'STUDENT', schoolId, isDeleted: false },
        select: { id: true }
    });

    if (!student) {
        throw { statusCode: 404, message: "Student not found" };
    }

    // 2. get grades for the current academic year only
    const grades = await prisma.grade.findMany({
        where: {
            studentId,
            academicYear: {
                isCurrent: true,
                isDeleted: false
            }
        },
        select: {
            score: true,
            examType: true,
            subject: { select: { name: true } },
            academicYear: { select: { name: true } }
        },
        orderBy: {
            subject: { name: 'asc' }
        }
    });

    // 3. Save to Redis Cache (30 minutes)
    try {
        await redis.set(cacheKey, JSON.stringify(grades), 'EX', 1800);
    } catch (err) {
        console.error("Redis Set Error:", err);
    }

    return grades;

};


/**
 * @description  get grades for the subjects taught by the teacher
 * @route GET /api/grades/subject-teacher/:studentId
 * @method GET
 * @access private (subject teacher only )
 */

exports.getSubjectTeacherStudentGradesService = async (schoolId, teacherId, studentId, academicYearId = null) => {
    // 1. Verify teacher exists (implicitly handled by middleware)

    // 2. Verify student exists in the school
    const student = await prisma.user.findFirst({
        where: { id: studentId, role: 'STUDENT', schoolId, isDeleted: false },
        select: { id: true, firstName: true, lastName: true }
    });

    if (!student) {
        throw { statusCode: 404, message: "Student not found" };
    }

    // 3. Determine academic year (Use provided or default to current)
    let filterYearId = academicYearId;
    if (!filterYearId) {
        const currentYear = await prisma.academicYear.findFirst({
            where: { schoolId, isCurrent: true, isDeleted: false },
            select: { id: true }
        });
        if (currentYear) {
            filterYearId = currentYear.id;
        }
    }

    // 4. Create a "where" clause.
    // We use OR to show grades if the teacher is the registrar or designated subject teacher.
    // This ensures they see the manual scores and calculated averages.
    const whereClause = {
        studentId,
        subject: { class: { schoolId } }, // Safety check within school
        OR: [
            { teacherId: teacherId },
            { subject: { teacherId: teacherId } }
        ]
    };

    if (filterYearId) {
        whereClause.academicYearId = filterYearId;
    }

    // 5. Fetch Grades
    const grades = await prisma.grade.findMany({
        where: whereClause,
        select: {
            id: true,
            score: true,
            examType: true,
            subject: { select: { name: true } },
            academicYear: { select: { name: true } },
            student: { select: { firstName: true, lastName: true } }
        },
        orderBy: [
            { academicYearId: 'desc' },
            { subject: { name: 'asc' } }
        ]
    });

    return grades;
}

/**
 * @description update grade
 * @route PUT /api/grades/:gradeId
 * @method PUT
 * @access private (school admin, assistant and subject teacher only )
 */

exports.updateGradeService = async (studentId, updateData, schoolId, userId, userRole) => {
    const { gradeId, score, notes, examType } = updateData;

    // 1. Fetch existing grade and check student context
    const existingGrade = await prisma.grade.findFirst({
        where: { id: gradeId, studentId },
        include: {
            subject: {
                select: {
                    teacherId: true,
                    class: { select: { schoolId: true } }
                }
            }
        }
    });

    // 2. Resource Validation
    if (!existingGrade) {
        throw { statusCode: 404, message: "Grade record not found for this student" };
    }

    if (existingGrade.subject.class.schoolId !== schoolId) {
        throw { statusCode: 403, message: "Unauthorized access to this school's data" };
    }

    // Prevent manually updating automated grades
    if (existingGrade.isCalculated) {
        throw { statusCode: 400, message: "Cannot manually update automatically calculated grades" };
    }

    // 3. Permission Checks
    const isAdmin = userRole === 'SCHOOL_ADMIN';
    const isAssistant = userRole === 'ASSISTANT';
    const isTeacher = userRole === 'TEACHER';
    const isSubjectTeacher = existingGrade.subject.teacherId === userId;
    const isGradeCreator = existingGrade.teacherId === userId;

    if (!isAdmin && !isAssistant) {
        // Teachers can only update if they teach the subject OR they were the ones who entered the grade
        if (!isTeacher || (!isSubjectTeacher && !isGradeCreator)) {
            throw { statusCode: 403, message: "You do not have permission to update this grade" };
        }
    }

    // 4. Update & Recalculate Averages (Atomic Transaction)
    try {
        const result = await prisma.$transaction(async (tx) => {
            // A. Update the grade record
            const updated = await tx.grade.update({
                where: { id: gradeId },
                data: {
                    ...(score !== undefined && { score }),
                    ...(notes !== undefined && { notes }),
                    ...(examType !== undefined && { examType }),
                    updatedAt: new Date()
                },
                select: {
                    id: true,
                    score: true,
                    examType: true,
                    isCalculated: true,
                    createdAt: true,
                    updatedAt: true,
                    studentId: true,
                    subjectId: true,
                    student: { select: { firstName: true, lastName: true } },
                    subject: { select: { name: true } },
                    academicYear: { select: { name: true } }
                }
            });

            // B. Re-calculate all related averages for this student/subject
            await calculateAveragesIfNeeded(
                tx,
                existingGrade.studentId,
                existingGrade.subjectId,
                existingGrade.academicYearId,
                userId
            );

            // C. Invalidate Caches
            await redis.del(`school:${schoolId}:student:${existingGrade.studentId}:grades`);
            await redis.delByPattern(`school:${schoolId}:class:*:results*`);

            return updated;

        });

        return result;

    } catch (error) {
        // Handle Unique Constraint Violation (P2002) - e.g. if examType is changed to an existing one
        if (error.code === 'P2002') {
            throw { statusCode: 409, message: "A grade for this exam type already exists for this subject" };
        }
        throw error;
    }
};

/**
 * @description delete grade
 * @route DELETE /api/grades/:gradeId
 * @method DELETE
 * @access private (school admin, assistant and subject teacher only)
 */
exports.deleteGradeService = async (gradeId, schoolId, userId, userRole) => {
    const existingGrade = await prisma.grade.findFirst({
        where: { id: gradeId },
        include: {
            subject: {
                select: {
                    teacherId: true,
                    class: { select: { schoolId: true } }
                }
            }
        }
    });

    if (!existingGrade) {
        throw { statusCode: 404, message: "Grade not found" };
    }

    if (existingGrade.subject.class.schoolId !== schoolId) {
        throw { statusCode: 403, message: "Unauthorized access to this school's data" };
    }

    if (existingGrade.isCalculated) {
        throw { statusCode: 400, message: "Cannot manually delete automatically calculated grades" };
    }

    const isAdmin = userRole === 'SCHOOL_ADMIN';
    const isAssistant = userRole === 'ASSISTANT';
    const isTeacher = userRole === 'TEACHER';
    const isSubjectTeacher = existingGrade.subject.teacherId === userId;
    const isGradeCreator = existingGrade.teacherId === userId;

    if (!isAdmin && !isAssistant) {
        if (!isTeacher || (!isSubjectTeacher && !isGradeCreator)) {
            throw { statusCode: 403, message: "You do not have permission to delete this grade" };
        }
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            const deleted = await tx.grade.delete({
                where: { id: gradeId }
            });

            await calculateAveragesIfNeeded(
                tx,
                existingGrade.studentId,
                existingGrade.subjectId,
                existingGrade.academicYearId,
                userId
            );

            // C. Invalidate Caches
            await redis.del(`school:${schoolId}:student:${existingGrade.studentId}:grades`);
            await redis.delByPattern(`school:${schoolId}:class:*:results*`);

            return deleted;

        });

        return result;

    } catch (error) {
        throw error;
    }
};

/**
 * @description get all grades for a specific class taught by the teacher
 * @route GET /api/grades/teacher-class/:classId
 */
exports.getTeacherClassGradesService = async (schoolId, teacherId, classId, academicYearId = null, subjectId = null, userRole = 'TEACHER') => {
    let filterYearId = academicYearId;
    if (!filterYearId) {
        const currentYear = await prisma.academicYear.findFirst({
            where: { schoolId, isCurrent: true, isDeleted: false },
            select: { id: true }
        });
        if (currentYear) filterYearId = currentYear.id;
    }

    // Role-based where clause
    // Managers and Assistants can see all grades for the school/class/subject
    // Teachers can only see grades they created OR grades for subjects they teach
    let whereClause = {};

    if (userRole === 'SCHOOL_ADMIN' || userRole === 'ASSISTANT') {
        whereClause = {
            academicYearId: filterYearId,
            subject: { schoolId }
        };
    } else {
        whereClause = {
            academicYearId: filterYearId,
            OR: [
                { teacherId: teacherId },
                { subject: { teacherId: teacherId } }
            ]
        };
    }

    if (subjectId) {
        whereClause.subjectId = subjectId;
    } else if (classId) {
        // More robust subject filtering to ensure we stay within school
        whereClause.subject = { ...(whereClause.subject || {}), classId, schoolId };
    }

    const grades = await prisma.grade.findMany({
        where: whereClause,
        select: {
            id: true,
            score: true,
            notes: true,
            examType: true,
            subjectId: true,
            subject: { select: { id: true, name: true } },
            academicYear: { select: { name: true } },
            studentId: true
        },
        orderBy: [
            { subject: { name: 'asc' } },
            { examType: 'asc' }
        ]
    });

    return grades;
};



/**
 * @description Get all student results for a class (used by school admin/assistant for viewing & printing)
 * Returns: class info, subjects, students with all their grades, school info, academic year
 * @access private (SCHOOL_ADMIN, ASSISTANT)
 */
exports.getClassStudentResultsService = async (schoolId, classId, academicYearId = null) => {
    // 1. Determine academic year
    let filterYearId = academicYearId;
    if (!filterYearId) {
        const currentYear = await prisma.academicYear.findFirst({
            where: { schoolId, isCurrent: true, isDeleted: false },
            select: { id: true, name: true }
        });
        if (!currentYear) throw { statusCode: 404, message: "لا توجد سنة دراسية حالية" };
        filterYearId = currentYear.id;
    }

    // 1.5. Check Redis Cache
    const cacheKey = `school:${schoolId}:class:${classId}:results:year:${filterYearId}`;
    try {
        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
    } catch (err) {
        console.error("Redis Get Error:", err);
    }

    // 2. Fetch class with subjects and students, plus school and academic year info - all in parallel
    const [classData, school, academicYear] = await Promise.all([
        prisma.class.findFirst({
            where: { id: classId, schoolId, isDeleted: false },
            select: {
                id: true,
                name: true,
                subjects: {
                    where: { isDeleted: false },
                    select: { id: true, name: true },
                    orderBy: { name: 'asc' }
                },
                students: {
                    where: { role: 'STUDENT', isDeleted: false },
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        gender: true
                    },
                    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }]
                }
            }
        }),
        prisma.school.findUnique({
            where: { id: schoolId },
            select: {
                id: true,
                name: true,
                logo: true,
                owner: {
                    select: { firstName: true, lastName: true }
                }
            }
        }),
        prisma.academicYear.findFirst({
            where: { id: filterYearId, schoolId, isDeleted: false },
            select: { id: true, name: true }
        })
    ]);

    if (!classData) throw { statusCode: 404, message: "الصف غير موجود" };
    if (!school) throw { statusCode: 404, message: "المدرسة غير موجودة" };
    if (!academicYear) throw { statusCode: 404, message: "السنة الدراسية غير موجودة" };

    // 3. Fetch all grades for all students in this class for the academic year
    const studentIds = classData.students.map(s => s.id);
    const subjectIds = classData.subjects.map(s => s.id);

    const grades = await prisma.grade.findMany({
        where: {
            studentId: { in: studentIds },
            subjectId: { in: subjectIds },
            academicYearId: filterYearId
        },
        select: {
            id: true,
            score: true,
            examType: true,
            studentId: true,
            subjectId: true
        }
    });

    const result = {
        classData: {
            id: classData.id,
            name: classData.name
        },
        subjects: classData.subjects,
        students: classData.students,
        grades,
        school: {
            name: school.name,
            logo: school.logo,
            adminName: `${school.owner.firstName} ${school.owner.lastName}`
        },
        academicYear: {
            id: academicYear.id,
            name: academicYear.name
        }
    };

    // 4. Save to Redis Cache (30 minutes)
    try {
        await redis.set(cacheKey, JSON.stringify(result), 'EX', 1800);
    } catch (err) {
        console.error("Redis Set Error:", err);
    }

    return result;
};
