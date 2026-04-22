const request = require('supertest');
jest.mock('../src/middleware/rateLimiter', () => ({
    globalLimiter: (req, res, next) => next(),
    authLimiter: (req, res, next) => next()
}));

const app = require('../src/app');
const prisma = require('../src/utils/prisma');

// Mock Redis
jest.mock('../src/config/redis', () => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    quit: jest.fn(),
}));

// Mock Prisma
jest.mock('../src/utils/prisma', () => {
    const mockPrisma = {
        subscriptionRequest: {
            create: jest.fn(),
            findMany: jest.fn(),
            count: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            deleteMany: jest.fn(),
            findFirst: jest.fn(),
        },
        subscription: {
            findUnique: jest.fn(),
            deleteMany: jest.fn(),
        },
        plan: {
            findUnique: jest.fn(),
        },
        $transaction: jest.fn((callback) => callback(mockPrisma)),
        $disconnect: jest.fn()
    };
    return mockPrisma;
});

describe('Subscription System Unit Tests (Mocked)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/subscriptions/request', () => {
        it('should create a subscription request successfully', async () => {
            const planId = "550e8400-e29b-41d4-a716-446655440001";
            prisma.subscriptionRequest.findFirst.mockResolvedValue(null);
            prisma.subscriptionRequest.create.mockResolvedValue({ id: "req-1", status: "PENDING" });

            const res = await request(app)
                .post('/api/subscriptions/request')
                .send({ planId: planId, paymentReceipt: "receipt-url" })
                .expect(201);

            expect(res.body.success).toBe(true);
        });
    });
});
