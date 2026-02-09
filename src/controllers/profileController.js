const { getUserProfileService, getTeacherStudentsService } = require("../services/profileService");



exports.getUserProfileController = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await getUserProfileService(userId);
        res.status(200).json(result);
    } catch (error) {
        console.error("Get Profile Controller Error:", error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

/**
 * @description Get classes and students for a teacher
 * @route GET /api/profile/teacher/students
 */
exports.getTeacherStudentsController = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await getTeacherStudentsService(userId);
        res.status(200).json(result);
    } catch (error) {
        console.error("Get Teacher Students Controller Error:", error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};