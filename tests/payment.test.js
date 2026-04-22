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
        payment: {
            aggregate: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            deleteMany: jest.fn(),
        },
        user: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            deleteMany: jest.fn(),
            count: jest.fn(),
        },
        school: {
            findUnique: jest.fn(),
            create: jest.fn(),
        },
        studentProfile: {
            findUnique: jest.fn(),
            upsert: jest.fn(),
        },
        $transaction: jest.fn((callback) => callback(mock)),
        $disconnect: jest.fn()
    };
    return mock;
});

const prisma = require('../src/utils/prisma');

describe('Payment System Unit Tests (Mocked)', () => {
    const testSchoolId = "test-school-id";
    const testUserId = "test-user-id";
    const studentId = "550e8400-e29b-41d4-a716-446655440002";

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/payments', () => {
        it('should create a payment successfully', async () => {
            prisma.user.findFirst.mockResolvedValue({ 
                id: studentId, 
                schoolId: testSchoolId,
                role: "STUDENT",
                school: { slug: "test" },
                class: { tuitionFee: 1000 },
                studentProfile: { discountAmount: 0 },
                paymentsMade: []
            });
            prisma.user.findUnique.mockResolvedValue({ id: testUserId, firstName: "Admin", lastName: "User" });
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
            prisma.user.findUnique.mockImplementation(({ where }) => {
                if (where.id === studentId) {
                    return Promise.resolve({
                        id: studentId,
                        schoolId: testSchoolId,
                        role: "STUDENT",
                        firstName: "Student",
                        lastName: "Test",
                        class: { tuitionFee: 2000 },
                        studentProfile: { discountAmount: 100 },
                        paymentsMade: []
                    });
                }
                return Promise.resolve({ id: testUserId, schoolId: testSchoolId, role: "SUPER_ADMIN" });
            });

            const res = await request(app)
                .get(`/api/payments/financial-record/${studentId}`)
                .expect(200);

            expect(res.body.status).toBe("SUCCESS");
        });
    });
});