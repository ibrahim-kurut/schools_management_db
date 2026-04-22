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
        plan: {
            create: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            deleteMany: jest.fn(),
        },
        $transaction: jest.fn((callback) => callback(mockPrisma)),
        $disconnect: jest.fn()
    };
    return mockPrisma;
});

describe('Plan System Unit Tests (Mocked)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/plans', () => {
        it('should create a new plan successfully', async () => {
            const testPlan = { name: "Pro Plan", price: 99, durationInDays: 30 };
            prisma.plan.create.mockResolvedValue({ id: "plan-1", ...testPlan });

            const res = await request(app)
                .post('/api/plans')
                .send(testPlan)
                .expect(201);

            expect(res.body.plan.name).toBe(testPlan.name);
        });
    });
});
