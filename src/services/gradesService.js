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
