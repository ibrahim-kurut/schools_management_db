const prisma = require("../utils/prisma");
const redis = require("../config/redis");
const nodemailer = require("nodemailer");

// إعداد Nodemailer (يرجى إضافة هذه المتغيرات في ملف .env)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER, 
        pass: process.env.SMTP_PASS, 
    },
});

const sendEmailNotification = async (userEmail, title, message) => {
    try {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.warn("⚠️ لم يتم إعداد SMTP في ملف .env. لن يتم إرسال الإيميل فعلياً:", userEmail);
            console.warn(`📩 رسالة البريد (محاكاة): [${title}] - ${message}`);
            return;
        }

        const mailOptions = {
            from: `"نظام إدارة المدارس" <${process.env.SMTP_USER}>`,
            to: userEmail,
            subject: title,
            html: `
            <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #2563eb;">${title}</h2>
                <p style="font-size: 16px; line-height: 1.5;">${message}</p>
                <hr style="border: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 12px; color: #777;">هذه رسالة تلقائية من نظام إدارة المدارس، يرجى عدم الرد عليها.</p>
            </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ تم إرسال البريد الإلكتروني بنجاح إلى ${userEmail}`);
    } catch (error) {
        console.error("❌ خطأ في إرسال البريد الإلكتروني:", error);
    }
};

/**
 * @description Create a new notification (In-app)
 * @param {string} userId - Target user ID
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type (e.g., SYSTEM, SUBSCRIPTION_REQUEST)
 */
exports.createNotificationService = async (userId, title, message, type = "SYSTEM") => {
    try {
        const notification = await prisma.notification.create({
            data: {
                userId,
                title,
                message,
                type,
            },
            include: { user: true } // نضمن جلب بيانات المستخدم لمعرفة الإيميل
        });

        // Invalidate user's notifications cache
        await redis.del(`notifications-${userId}`);

        // إرسال الإشعار عبر البريد الإلكتروني
        if (notification.user && notification.user.email) {
            sendEmailNotification(notification.user.email, title, message);
        }

        return notification;
    } catch (error) {
        console.error("Error creating notification:", error);
        // Don't throw to prevent breaking main flows if notification fails
    }
};

/**
 * @description Get user notifications
 * @param {string} userId 
 */
exports.getUserNotificationsService = async (userId) => {
    const cacheKey = `notifications-${userId}`;
    const cachedNotifications = await redis.get(cacheKey);

    if (cachedNotifications) {
        return JSON.parse(cachedNotifications);
    }

    const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50 // Get last 50 notifications
    });

    await redis.set(cacheKey, JSON.stringify(notifications), 'EX', 300); // 5 mins cache

    return notifications;
};

/**
 * @description Mark notification as read
 * @param {string} notificationId 
 * @param {string} userId 
 */
exports.markAsReadService = async (notificationId, userId) => {
    const notification = await prisma.notification.updateMany({
        where: { 
            id: notificationId,
            userId: userId // Ensure user owns this notification
        },
        data: { isRead: true }
    });

    if (notification.count > 0) {
        await redis.del(`notifications-${userId}`);
    }

    return notification;
};

/**
 * @description Mark all user notifications as read
 * @param {string} userId 
 */
exports.markAllAsReadService = async (userId) => {
    await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true }
    });

    await redis.del(`notifications-${userId}`);
    return { success: true };
};
