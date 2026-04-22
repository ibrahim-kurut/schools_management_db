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
        expense: {
            create: jest.fn(),
            findMany: jest.fn(),
            findFirst: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            count: jest.fn(),
            createMany: jest.fn(),
            deleteMany: jest.fn(),
        },
        $transaction: jest.fn((callback) => callback(mockPrisma)),
        $disconnect: jest.fn()
    };
    return mockPrisma;
});

describe('Expense System Unit Tests (Mocked)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/expenses', () => {
        it('should create an expense successfully', async () => {
            prisma.expense.create.mockResolvedValue({
                id: 1,
                title: "Stationery",
                amount: 150,
                type: "SUPPLIES"
            });

            const expenseData = { title: "Stationery", amount: 150, type: "SUPPLIES" };

            const res = await request(app)
                .post('/api/expenses')
                .send(expenseData)
                .expect(201);

            expect(res.body.status).toBe("SUCCESS");
        });
    });
});
