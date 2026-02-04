const { createGradeService } = require("../services/gradesService");
const { createGradeSchema } = require("../utils/gradesValidate");

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