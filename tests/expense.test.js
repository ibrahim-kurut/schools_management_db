const request = require('supertest');
jest.mock('../src/middleware/rateLimiter', () => ({
    globalLimiter: (req, res, next) => next(),
    authLimiter: (req, res, next) => next()
}));

const app = require('../src/app');
const prisma = require('../src/utils/prisma');
const { generateToken } = require('../src/utils/auth');

// Mock Prisma
jest.mock('../src/utils/prisma', () => ({
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
        findFirst: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
    },
    school: {
        findUnique: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
    },
    $disconnect: jest.fn()
}));

describe('Expense System Unit Tests (Mocked)', () => {
    const schoolId = "school-uuid";
    const accountantToken = ['cookie=mock-token'];

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

            const expenseData = {
                title: "Stationery",
                amount: 150,
                type: "SUPPLIES"
            };

            const res = await request(app)
                .post('/api/expenses')
                .set('Cookie', accountantToken)
                .send(expenseData)
                .expect(201);

            expect(res.body.status).toBe("SUCCESS");
            expect(prisma.expense.create).toHaveBeenCalled();
        });
    });

    describe('GET /api/expenses', () => {
        it('should fetch expenses with pagination', async () => {
            prisma.expense.findMany.mockResolvedValue([
                { id: 1, title: "Exp 1", amount: 100 }
            ]);
            prisma.expense.count.mockResolvedValue(1);

            const res = await request(app)
                .get('/api/expenses')
                .set('Cookie', accountantToken)
                .expect(200);

            expect(res.body.status).toBe("SUCCESS");
            expect(res.body.data.length).toBe(1);
        });
    });
});
