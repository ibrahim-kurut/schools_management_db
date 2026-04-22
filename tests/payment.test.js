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
        payment: {
            aggregate: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            update: jest.fn(),
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
        class: {
            findUnique: jest.fn(),
            create: jest.fn(),
            deleteMany: jest.fn(),
        },
        studentProfile: {
            create: jest.fn(),
            findUnique: jest.fn(),
            deleteMany: jest.fn(),
        },
        $transaction: jest.fn((callback) => callback(mockPrisma)),
        $disconnect: jest.fn()
    };
    return mockPrisma;
});

describe('Payment System Unit Tests (Mocked)', () => {
    const studentId = "550e8400-e29b-41d4-a716-446655440002";
    const schoolId = "550e8400-e29b-41d4-a716-446655440003";

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/payments', () => {
        it('should create a payment successfully', async () => {
            prisma.user.findUnique.mockResolvedValue({ id: studentId, schoolId: schoolId });
            prisma.school.findUnique.mockResolvedValue({ id: schoolId, slug: 'test' });
            prisma.payment.create.mockResolvedValue({
                id: 1,
                amount: 500,
                status: "COMPLETED",
                invoiceNumber: "PAY-123"
            });

            const paymentData = {
                studentId: studentId,
                amount: 500,
                paymentType: "TUITION"
            };

            const res = await request(app)
                .post('/api/payments')
                .send(paymentData)
                .expect(201);

            expect(res.body.status).toBe("SUCCESS");
        });
    });

    describe('GET /api/payments/financial-record/:studentId', () => {
        it('should return financial record', async () => {
            prisma.user.findUnique.mockResolvedValue({ 
                id: studentId, 
                schoolId: schoolId, 
                class: { tuitionFee: 2000 } 
            });
            prisma.payment.findMany.mockResolvedValue([
                { amount: 500, paymentType: "TUITION" }
            ]);
            prisma.studentProfile.findUnique.mockResolvedValue({ discountAmount: 100 });

            const res = await request(app)
                .get(`/api/payments/financial-record/${studentId}`)
                .expect(200);

            expect(res.body.status).toBe("SUCCESS");
        });
    });
});