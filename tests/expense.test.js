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
    delByPattern: jest.fn(),
    quit: jest.fn(),
}));

// Robust Prisma Mock
jest.mock('../src/utils/prisma', () => {
    const mock = {
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
        user: {
            findUnique: jest.fn(),
        },
        $transaction: jest.fn((callback) => callback(mock)),
        $disconnect: jest.fn()
    };
    return mock;
});

const prisma = require('../src/utils/prisma');

describe('Expense System Unit Tests (Mocked)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/expenses', () => {
        it('should create an expense successfully', async () => {
            const expenseData = { title: "Stationery", amount: 150, type: "SUPPLIES" };
            
            prisma.user.findUnique.mockResolvedValue({ id: "test-user-id", role: "SCHOOL_ADMIN" });
            prisma.expense.create.mockResolvedValue({
                id: 1,
                ...expenseData,
                recipient: null,
                recordedBy: { firstName: "Admin", lastName: "User" }
            });

            const res = await request(app)
                .post('/api/expenses')
                .send(expenseData)
                .expect(201);

            expect(res.body.status).toBe("SUCCESS");
        });
    });
});
