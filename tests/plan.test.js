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
        plan: {
            create: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        $transaction: jest.fn((callback) => callback(mock)),
        $disconnect: jest.fn()
    };
    return mock;
});

const prisma = require('../src/utils/prisma');

describe('Plan System Unit Tests (Mocked)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/plans', () => {
        it('should create a new plan successfully', async () => {
            const testPlan = {
                name: "Premium",
                price: 100,
                durationInDays: 30,
                maxStudents: 500,
                bufferStudents: 50,
                description: "Full features"
            };

            prisma.plan.create.mockResolvedValue({ id: "plan-1", ...testPlan });

            const res = await request(app)
                .post('/api/plans')
                .send(testPlan)
                .expect(201);

            expect(res.body.data.name).toBe(testPlan.name);
        });
    });
});
