const request = require('supertest');
jest.mock('../src/middleware/rateLimiter', () => ({
    globalLimiter: (req, res, next) => next(),
    authLimiter: (req, res, next) => next()
}));

const app = require('../src/app');
const prisma = require('../src/utils/prisma');

// Mock Prisma
jest.mock('../src/utils/prisma', () => ({
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
        deleteMany: jest.fn(),
    },
    $disconnect: jest.fn()
}));

describe('Payment System Unit Tests (Mocked)', () => {
    const schoolId = "school-uuid";
    const studentId = "student-uuid";
    const accountantToken = ['cookie=mock-token'];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/payments', () => {
        it('should create a payment successfully', async () => {
            prisma.user.findUnique.mockResolvedValue({ id: studentId, schoolId });
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
                .set('Cookie', accountantToken)
                .send(paymentData)
                .expect(201);

            expect(res.body.status).toBe("SUCCESS");
            expect(prisma.payment.create).toHaveBeenCalled();
        });

        it('should fail if student does not exist', async () => {
            prisma.user.findUnique.mockResolvedValue(null);

            const paymentData = {
                studentId: "non-existent",
                amount: 100,
                paymentType: "TUITION"
            };

            const res = await request(app)
                .post('/api/payments')
                .set('Cookie', accountantToken)
                .send(paymentData)
                .expect(500); // Service throws error
        });
    });

    describe('GET /api/payments/financial-record/:studentId', () => {
        it('should return financial record', async () => {
            prisma.user.findUnique.mockResolvedValue({ id: studentId, schoolId, class: { tuitionFee: 2000 } });
            prisma.payment.findMany.mockResolvedValue([
                { amount: 500, paymentType: "TUITION" }
            ]);
            prisma.studentProfile.findUnique = jest.fn().mockResolvedValue({ discountAmount: 100 });

            const res = await request(app)
                .get(`/api/payments/financial-record/${studentId}`)
                .set('Cookie', accountantToken)
                .expect(200);

            expect(res.body.status).toBe("SUCCESS");
            expect(res.body.data.summary.totalPaid).toBe(500);
        });
    });
});