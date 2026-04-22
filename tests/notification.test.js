const request = require('supertest');
jest.mock('../src/middleware/rateLimiter', () => ({
    globalLimiter: (req, res, next) => next(),
    authLimiter: (req, res, next) => next()
}));

const app = require('../src/app');
const prisma = require('../src/utils/prisma');

// Mock Prisma
jest.mock('../src/utils/prisma', () => ({
    notification: {
        create: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
    },
    $disconnect: jest.fn()
}));

describe('Notification System Unit Tests (Mocked)', () => {
    const userToken = ['cookie=mock-user-token'];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/notifications', () => {
        it('should fetch notifications', async () => {
            prisma.notification.findMany.mockResolvedValue([{ id: "1", message: "Hello" }]);

            const res = await request(app)
                .get('/api/notifications')
                .set('Cookie', userToken)
                .expect(200);

            expect(res.body.notifications.length).toBe(1);
        });
    });
});
