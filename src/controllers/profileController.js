const { getUserProfileService, getTeacherStudentsService } = require("../services/profileService");
const asyncHandler = require("../utils/asyncHandler");

exports.getUserProfileController = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const result = await getUserProfileService(userId);
    res.status(200).json(result);
});

/**
 * @description Get classes and students for a teacher
 * @route GET /api/profile/teacher/students
 */
exports.getTeacherStudentsController = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const result = await getTeacherStudentsService(userId);
    res.status(200).json(result);
});