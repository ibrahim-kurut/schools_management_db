const { createGradeService, getGradesByStudentIdService, getStudentGradesService } = require("../services/gradesService");
const { createGradeSchema } = require("../utils/gradesValidate");
const { validateId } = require("../utils/validateUUID");

/**
 * @description Create new Grade
 * @route POST /api/grades
 * @method POST
 * @access private (school admin, teacher)
 */
exports.createGradeController = async (req, res) => {
    try {
        // 0. Get user info from token
        const schoolId = req.user.schoolId;
        const userId = req.user.id;
        const userRole = req.user.role;

        // 1. Validate the request body
        const { error, value: gradeData } = createGradeSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message,
            });
        }

        // 2. Call service to create grade
        const newGrade = await createGradeService(gradeData, schoolId, userId, userRole);

        // 3. Return success response
        return res.status(201).json({
            success: true,
            message: "Grade created successfully",
            grade: newGrade
        });

    } catch (error) {
        console.error("Grade Controller Error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
};

/**
 * @description get grades of one student (defaults to current academic year, supports filtering)
 * @route GET /api/grades/student/:studentId?academicYearId=...
 * @method GET
 * @access private (school admin, assistant)
 */
exports.getGradesByStudentIdController = async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { studentId } = req.params;
        const { academicYearId } = req.query; // Get academicYearId from query params
        const userRole = req.user.role;

        //1. validate studentId
        const { error: studentIdError } = validateId(studentId);
        if (studentIdError) {
            return res.status(400).json({
                success: false, message: studentIdError.details[0].message,
            });
        }

        // Validate academicYearId if provided
        if (academicYearId) {
            const { error: yearIdError } = validateId(academicYearId);
            if (yearIdError) {
                return res.status(400).json({
                    success: false, message: yearIdError.details[0].message,
                });
            }
        }

        //2. call service and pass schoolId, studentId, and optional academicYearId
        const grades = await getGradesByStudentIdService(studentId, schoolId, userRole, academicYearId);

        //3. Return success response
        return res.status(200).json({
            success: true,
            message: "Grades retrieved successfully",
            grades
        });

    } catch (error) {
        console.error("Grade Controller Error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
};

/**
 * @description student can view his grades for the current academic year in all subjects
 * @route GET /api/grades/student/:studentId
 * @method GET
 * @access private (student only )
 */

exports.getStudentGradesController = async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const studentId = req.user.id; // Use the authenticated student's ID
        const userRole = req.user.role;

        // Ensure user is a student
        if (userRole !== 'STUDENT') {
            return res.status(403).json({
                success: false,
                message: "Only students can view their own grades"
            });
        }

        // Call service to get student's grades for current academic year
        const grades = await getStudentGradesService(studentId, schoolId, userRole);

        return res.status(200).json({
            success: true,
            message: "Student grades retrieved successfully",
            grades
        });

    } catch (error) {

    }
}