const {
    getUserNotificationsService,
    markAsReadService,
    markAllAsReadService
} = require("../services/notificationService");
const asyncHandler = require("../utils/asyncHandler");

/**
 * @description Get user notifications
 * @route GET /api/notifications
 * @access private
 */
exports.getUserNotificationsController = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const notifications = await getUserNotificationsService(userId);

    res.status(200).json({
        success: true,
        data: notifications
    });
});

/**
 * @description Mark a notification as read
 * @route PATCH /api/notifications/:id/read
 * @access private
 */
exports.markAsReadController = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    await markAsReadService(id, userId);

    res.status(200).json({
        success: true,
        message: "تم تحديث حالة الإشعار"
    });
});

/**
 * @description Mark all notifications as read
 * @route PATCH /api/notifications/read-all
 * @access private
 */
exports.markAllAsReadController = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    await markAllAsReadService(userId);

    res.status(200).json({
        success: true,
        message: "تم تحديث جميع الإشعارات كمقروءة"
    });
});
