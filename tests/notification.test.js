const {
    createNotificationService,
    getUserNotificationsService,
    markAsReadService,
    markAllAsReadService
} = require('../src/services/notificationService');
const prisma = require('../src/utils/prisma');
const redis = require('../src/config/redis');

jest.mock('../src/utils/prisma', () => ({
    notification: {
        create: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
    }
}));

jest.mock('../src/config/redis', () => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
}));

jest.mock('nodemailer', () => ({
    createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue(true)
    })
}));

describe('Notification Service Tests', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createNotificationService', () => {
        it('should create notification and clear cache', async () => {
            const userId = 1;
            const title = 'Test Title';
            const message = 'Test Message';

            prisma.notification.create.mockResolvedValue({ id: 1, userId, title, message, user: { email: 'test@example.com' } });

            const result = await createNotificationService(userId, title, message);

            expect(result.id).toBe(1);
            expect(prisma.notification.create).toHaveBeenCalled();
            expect(redis.del).toHaveBeenCalledWith(`notifications-${userId}`);
        });

        it('should handle errors silently', async () => {
            const userId = 1;
            prisma.notification.create.mockRejectedValue(new Error('DB Error'));

            // The service catches the error and logs it, shouldn't throw
            const result = await createNotificationService(userId, 'T', 'M');
            expect(result).toBeUndefined();
        });
    });

    describe('getUserNotificationsService', () => {
        it('should return cached notifications if available', async () => {
            const userId = 1;
            const cachedData = [{ id: 1, title: 'Cached' }];
            redis.get.mockResolvedValue(JSON.stringify(cachedData));

            const result = await getUserNotificationsService(userId);

            expect(result).toEqual(cachedData);
            expect(prisma.notification.findMany).not.toHaveBeenCalled();
        });

        it('should fetch from DB if cache is empty', async () => {
            const userId = 1;
            redis.get.mockResolvedValue(null);
            prisma.notification.findMany.mockResolvedValue([{ id: 1, title: 'DB' }]);

            const result = await getUserNotificationsService(userId);

            expect(result[0].title).toBe('DB');
            expect(redis.set).toHaveBeenCalled();
        });
    });

    describe('markAsReadService', () => {
        it('should mark notification as read', async () => {
            const notificationId = 1;
            const userId = 1;

            prisma.notification.updateMany.mockResolvedValue({ count: 1 });

            await markAsReadService(notificationId, userId);

            expect(prisma.notification.updateMany).toHaveBeenCalledWith({
                where: { id: notificationId, userId },
                data: { isRead: true }
            });
            expect(redis.del).toHaveBeenCalledWith(`notifications-${userId}`);
        });
    });

    describe('markAllAsReadService', () => {
        it('should mark all notifications as read', async () => {
            const userId = 1;

            prisma.notification.updateMany.mockResolvedValue({ count: 5 });

            const result = await markAllAsReadService(userId);

            expect(result.success).toBe(true);
            expect(prisma.notification.updateMany).toHaveBeenCalledWith({
                where: { userId, isRead: false },
                data: { isRead: true }
            });
            expect(redis.del).toHaveBeenCalledWith(`notifications-${userId}`);
        });
    });
});
