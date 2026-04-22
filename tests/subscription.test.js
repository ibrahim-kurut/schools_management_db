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

// Mock Notification Service
jest.mock('../src/services/notificationService', () => ({
    createNotificationService: jest.fn().mockResolvedValue(true)
}));

// Robust Prisma Mock
jest.mock('../src/utils/prisma', () => {
    const mock = {
        subscriptionRequest: {
            create: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findFirst: jest.fn(),
        },
        school: { findUnique: jest.fn() },
        plan: { findUnique: jest.fn() },
        user: { findMany: jest.fn() },
        $transaction: jest.fn((callback) => callback(mock)),
        $disconnect: jest.fn()
    };
    return mock;
});

const prisma = require('../src/utils/prisma');

describe('Subscription System Unit Tests (Mocked)', () => {
    const planId = "550e8400-e29b-41d4-a716-446655440000";

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/subscriptions/request', () => {
        it('should create a subscription request', async () => {
            const requestData = { planId };
            
            prisma.school.findUnique.mockResolvedValue({ id: "school-1", name: "Test School" });
            prisma.plan.findUnique.mockResolvedValue({ id: planId, name: "Basic Plan" });
            prisma.subscriptionRequest.findFirst.mockResolvedValue(null);
            prisma.user.findMany.mockResolvedValue([]); 
            
            prisma.subscriptionRequest.create.mockResolvedValue({ 
                id: "req-1", 
                planId,
                plan: { name: "Basic Plan", price: 100, durationInDays: 30 }
            });

            const res = await request(app)
                .post('/api/subscriptions/request')
                .send(requestData)
                .expect(201);

            expect(res.body.success).toBe(true);
        });
    });
});
