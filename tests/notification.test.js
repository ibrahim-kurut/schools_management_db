const request = require('supertest');
jest.mock('../src/middleware/rateLimiter', () => ({
    globalLimiter: (req, res, next) => next(),
    authLimiter: (req, res, next) => next()
}));

const app = require('../src/app');

// Mock Redis
jest.mock('../src/config/redis', () => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    quit: jest.fn(),
}));

// Robust Prisma Mock
jest.mock('../src/utils/prisma', () => {
    const mock = {
        notification: {
            findMany: jest.fn(),
            update: jest.fn(),
            updateMany: jest.fn(),
            create: jest.fn(),
        },
        $transaction: jest.fn((callback) => callback(mock)),
        $disconnect: jest.fn()
    };
    return mock;
});

const prisma = require('../src/utils/prisma');

describe('Notification System Unit Tests (Mocked)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/notifications', () => {
        it('should fetch notifications', async () => {
            prisma.notification.findMany.mockResolvedValue([
                { id: "notif-1", title: "Test", message: "Hello", isRead: false }
            ]);

            const res = await request(app)
                .get('/api/notifications')
                .expect(200);

            expect(res.body.data.length).toBe(1);
        });
    });
});
