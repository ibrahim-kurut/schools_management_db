const request = require('supertest');
jest.mock('../src/middleware/rateLimiter', () => ({
    globalLimiter: (req, res, next) => next(),
    authLimiter: (req, res, next) => next()
}));

const app = require('../src/app');
const prisma = require('../src/utils/prisma');
const redis = require('../src/config/redis');

// Mock Prisma
jest.mock('../src/utils/prisma', () => ({
    subscriptionRequest: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
    },
    subscription: {
        findUnique: jest.fn(),
        deleteMany: jest.fn(),
    },
    school: {
        findUnique: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
    },
    user: {
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
    },
    class: {
        deleteMany: jest.fn(),
    },
    plan: {
        create: jest.fn(),
        deleteMany: jest.fn(),
    },
    $disconnect: jest.fn()
}));

// Mock Redis
jest.mock('../src/config/redis', () => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    flushall: jest.fn(),
    quit: jest.fn(),
}));

describe('Subscription System Unit Tests (Mocked)', () => {
    const schoolAdminToken = ['cookie=mock-admin-token'];
    const superAdminToken = ['cookie=mock-super-token'];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/subscriptions/request', () => {
        it('should create a subscription request successfully', async () => {
            prisma.subscriptionRequest.findFirst = jest.fn().mockResolvedValue(null);
            prisma.subscriptionRequest.create.mockResolvedValue({
                id: "req-uuid",
                status: "PENDING"
            });

            const res = await request(app)
                .post('/api/subscriptions/request')
                .set('Cookie', schoolAdminToken)
                .send({
                    planId: "plan-uuid",
                    paymentReceipt: "http://receipt.com"
                })
                .expect(201);

            expect(res.body.success).toBe(true);
            expect(prisma.subscriptionRequest.create).toHaveBeenCalled();
        });
    });
});
