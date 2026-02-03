const { getUserProfileService } = require("../services/profileService");



exports.getUserProfileController = async (req, res) => {
    const userId = req.user.id;
    const user = await getUserProfileService(userId);
    res.status(200).json(user);
};