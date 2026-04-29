const prisma = require("../utils/prisma");

/**
 * @description Create a new contact message
 */
exports.createContactMessageService = async (data) => {
    return prisma.contactMessage.create({
        data,
    });
};

/**
 * @description Get all contact messages
 */
exports.getAllContactMessagesService = async () => {
    return prisma.contactMessage.findMany({
        orderBy: { createdAt: "desc" },
    });
};

/**
 * @description Get unread contact messages count
 */
exports.getUnreadMessagesCountService = async () => {
    return prisma.contactMessage.count({
        where: { isRead: false },
    });
};

/**
 * @description Get a specific message by ID
 */
exports.getContactMessageByIdService = async (id) => {
    return prisma.contactMessage.findUnique({
        where: { id },
    });
};

/**
 * @description Mark a message as read
 */
exports.markMessageAsReadService = async (id) => {
    return prisma.contactMessage.update({
        where: { id },
        data: { isRead: true },
    });
};

/**
 * @description Delete a message
 */
exports.deleteContactMessageService = async (id) => {
    return prisma.contactMessage.delete({
        where: { id },
    });
};
