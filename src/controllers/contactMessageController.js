const asyncHandler = require("../utils/asyncHandler");
const { contactMessageSchema } = require("../utils/contactMessageValidate");
const {
    createContactMessageService,
    getAllContactMessagesService,
    getUnreadMessagesCountService,
    getContactMessageByIdService,
    markMessageAsReadService,
    deleteContactMessageService,
} = require("../services/contactMessageService");

/**
 * @description Submit a new contact message
 * @route POST /api/contact-messages
 * @access public
 */
exports.createContactMessageController = asyncHandler(async (req, res) => {
    // Validate request body
    const { error, value } = contactMessageSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: error.details[0].message,
        });
    }

    const message = await createContactMessageService(value);

    res.status(201).json({
        success: true,
        message: "تم إرسال رسالتك بنجاح. سنتواصل معك قريباً.",
        data: message,
    });
});

/**
 * @description Get all contact messages
 * @route GET /api/contact-messages
 * @access private (Super Admin only)
 */
exports.getAllContactMessagesController = asyncHandler(async (req, res) => {
    const messages = await getAllContactMessagesService();
    const unreadCount = await getUnreadMessagesCountService();

    res.status(200).json({
        success: true,
        data: messages,
        count: messages.length,
        unreadCount,
    });
});

/**
 * @description Get a specific contact message by ID
 * @route GET /api/contact-messages/:id
 * @access private (Super Admin only)
 */
exports.getContactMessageByIdController = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const message = await getContactMessageByIdService(id);

    if (!message) {
        return res.status(404).json({
            success: false,
            message: "الرسالة غير موجودة",
        });
    }

    res.status(200).json({
        success: true,
        data: message,
    });
});

/**
 * @description Mark a contact message as read
 * @route PATCH /api/contact-messages/:id/read
 * @access private (Super Admin only)
 */
exports.markMessageAsReadController = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Check if message exists
    const existingMessage = await getContactMessageByIdService(id);
    if (!existingMessage) {
        return res.status(404).json({
            success: false,
            message: "الرسالة غير موجودة",
        });
    }

    const updatedMessage = await markMessageAsReadService(id);

    res.status(200).json({
        success: true,
        message: "تم تحديد الرسالة كمقروءة",
        data: updatedMessage,
    });
});

/**
 * @description Delete a contact message
 * @route DELETE /api/contact-messages/:id
 * @access private (Super Admin only)
 */
exports.deleteContactMessageController = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check if message exists
    const existingMessage = await getContactMessageByIdService(id);
    if (!existingMessage) {
        return res.status(404).json({
            success: false,
            message: "الرسالة غير موجودة",
        });
    }

    await deleteContactMessageService(id);

    res.status(200).json({
        success: true,
        message: "تم حذف الرسالة بنجاح",
    });
});
