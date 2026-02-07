const prisma = require("../utils/prisma");
const { MANUAL_EXAM_TYPES, CALCULATED_EXAM_TYPES } = require("../utils/gradesValidate");
const { calculateAveragesIfNeeded } = require("./gradeCalculations");

/**
 * @description create a new grade
 * @route POST /api/grades
 * @method POST
 * @access private (school admin, teacher)
 */
exports.createGradeService = async (gradeData, schoolId, userId, userRole) => {
    const { studentId, subjectId, academicYearId, examType, score } = gradeData;

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
                    examType,
                    isCalculated: false,
                    studentId,
                    subjectId,
                    teacherId: userId,
                    academicYearId
                },
                include: {
                    student: { select: { firstName: true, lastName: true } },
                    subject: { select: { name: true } },
                    academicYear: { select: { name: true } }
                }
            });

            // B. Calculate Averages
            await calculateAveragesIfNeeded(tx, studentId, subjectId, academicYearId, userId);
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

//! TODO
/**

 * 
 * الطالب يستطيع جلب درجاته للسنة الحالية فقط
 * الادمن والمساعد (تم تنفيذها) يستطيعون جلب درجات أي طالب في أي سنة دراسية
 */

