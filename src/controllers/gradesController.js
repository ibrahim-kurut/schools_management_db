const { createGradeService, getGradesByStudentIdService, getStudentGradesService, getSubjectTeacherStudentGradesService, updateGradeService, deleteGradeService, getTeacherClassGradesService, getClassStudentResultsService } = require("../services/gradesService");
const { createGradeSchema, updateGradeSchema } = require("../utils/gradesValidate");
const { validateId } = require("../utils/validateUUID");
const asyncHandler = require("../utils/asyncHandler");

/**
 * @description Create new Grade
 * @route POST /api/grades
 * @method POST
 * @access private (school admin, teacher)
 */
exports.createGradeController = asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    const userId = req.user.id;
    const userRole = req.user.role;

    const { error, value: gradeData } = createGradeSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: error.details[0].message,
        });
    }

    const newGrade = await createGradeService(gradeData, schoolId, userId, userRole);

    return res.status(201).json({
        success: true,
        message: "Grade created successfully",
        grade: newGrade
    });
});

/**
 * @description get grades of one student (defaults to current academic year, supports filtering)
 * @route GET /api/grades/student/:studentId?academicYearId=...
 * @method GET
 * @access private (school admin, assistant)
 */
exports.getGradesByStudentIdController = asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    const { studentId } = req.params;
    const { academicYearId } = req.query;
    const userRole = req.user.role;

    const { error: studentIdError } = validateId(studentId);
    if (studentIdError) {
        return res.status(400).json({
            success: false, message: studentIdError.details[0].message,
        });
    }

    if (academicYearId) {
        const { error: yearIdError } = validateId(academicYearId);
        if (yearIdError) {
            return res.status(400).json({
                success: false, message: yearIdError.details[0].message,
            });
        }
    }

    const grades = await getGradesByStudentIdService(studentId, schoolId, userRole, academicYearId);

    return res.status(200).json({
        success: true,
        message: "Grades retrieved successfully",
        grades
    });
});

/**
 * @description student can view his grades for the current academic year in all subjects
 * @route GET /api/grades/student/:studentId
 * @method GET
 * @access private (student only )
 */
exports.getStudentGradesController = asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    const studentId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'STUDENT') {
        return res.status(403).json({
            success: false,
            message: "Only students can view their own grades"
        });
    }

    const grades = await getStudentGradesService(studentId, schoolId, userRole);

    return res.status(200).json({
        success: true,
        message: "Student grades retrieved successfully",
        grades
    });
});

/**
 * @description  get grades for the subjects taught by the teacher
 * @route GET /api/grades/subject-teacher/:studentId
 * @method GET
 * @access private (subject teacher only )
 */
exports.getSubjectTeacherStudentGradesController = asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    const teacherId = req.user.id;
    const { studentId } = req.params;
    const { academicYearId } = req.query;

    const { error: studentIdError } = validateId(studentId);
    if (studentIdError) {
        return res.status(400).json({
            success: false, message: studentIdError.details[0].message,
        });
    }

    if (academicYearId) {
        const { error: yearIdError } = validateId(academicYearId);
        if (yearIdError) {
            return res.status(400).json({
                success: false, message: yearIdError.details[0].message,
            });
        }
    }

    const grades = await getSubjectTeacherStudentGradesService(schoolId, teacherId, studentId, academicYearId);

    return res.status(200).json({
        success: true,
        message: "Student grades retrieved successfully",
        grades
    });
});

/**
 * @description update grade
 * @route PUT /api/grades/:gradeId
 * @method PUT
 * @access private (subject teacher only )
 */
exports.updateGradeController = asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { studentId } = req.params;

    const { error: studentIdError } = validateId(studentId);
    if (studentIdError) {
        return res.status(400).json({
            success: false,
            message: "Invalid student identity",
        });
    }

    const { error: bodyError, value: updateData } = updateGradeSchema.validate(req.body);
    if (bodyError) {
        return res.status(400).json({
            success: false,
            message: bodyError.details[0].message
        });
    }

    const updatedGrade = await updateGradeService(studentId, updateData, schoolId, userId, userRole);

    return res.status(200).json({
        success: true,
        message: "Grade updated successfully",
        grade: updatedGrade
    });
});

/**
 * @description delete grade
 * @route DELETE /api/grades/:gradeId
 * @method DELETE
 * @access private
 */
exports.deleteGradeController = asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { gradeId } = req.params;

    const { error: gradeIdError } = validateId(gradeId);
    if (gradeIdError) {
        return res.status(400).json({ success: false, message: "Invalid grade identity" });
    }

    await deleteGradeService(gradeId, schoolId, userId, userRole);

    return res.status(200).json({ success: true, message: "Grade deleted successfully" });
});

/**
 * @description get all grades for a class taught by the teacher
 * @route GET /api/grades/teacher-class/:classId
 * @method GET
 * @access private (teacher only)
 */
exports.getTeacherClassGradesController = asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    const teacherId = req.user.id;
    const { classId } = req.params;
    const { academicYearId, subjectId } = req.query;

    const { error: classIdError } = validateId(classId);
    if (classIdError) return res.status(400).json({ success: false, message: classIdError.details[0].message });

    if (academicYearId) {
        const { error: yearIdError } = validateId(academicYearId);
        if (yearIdError) return res.status(400).json({ success: false, message: yearIdError.details[0].message });
    }

    if (subjectId) {
        const { error: subIdError } = validateId(subjectId);
        if (subIdError) return res.status(400).json({ success: false, message: subIdError.details[0].message });
    }

    const grades = await getTeacherClassGradesService(schoolId, teacherId, classId, academicYearId, subjectId, req.user.role);

    return res.status(200).json({
        success: true,
        message: "Class grades retrieved successfully",
        grades
    });
});

/**
 * @description Get all student results for a class (for admin viewing & printing)
 * @route GET /api/grades/class/:classId/results
 * @method GET
 * @access private (SCHOOL_ADMIN, ASSISTANT)
 */
exports.getClassStudentResultsController = asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    const { classId } = req.params;
    const { academicYearId } = req.query;

    const { error: classIdError } = validateId(classId);
    if (classIdError) {
        return res.status(400).json({ success: false, message: classIdError.details[0].message });
    }

    if (academicYearId) {
        const { error: yearIdError } = validateId(academicYearId);
        if (yearIdError) {
            return res.status(400).json({ success: false, message: yearIdError.details[0].message });
        }
    }

    const results = await getClassStudentResultsService(schoolId, classId, academicYearId);

    return res.status(200).json({
        success: true,
        message: "Student results retrieved successfully",
        results
    });
});
