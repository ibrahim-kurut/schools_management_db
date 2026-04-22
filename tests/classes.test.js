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
        class: {
            create: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            deleteMany: jest.fn(),
            count: jest.fn(),
        },
        school: { findUnique: jest.fn() },
        user: { findMany: jest.fn() },
        $transaction: jest.fn((callback) => callback(mockPrisma)),
        $disconnect: jest.fn()
    };
    return mockPrisma;
});

describe('Class System Unit Tests (Mocked)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/classes', () => {
        it('should create a new class', async () => {
            const classData = { name: "Grade 10A", tuitionFee: 1000 };
            prisma.class.create.mockResolvedValue({ id: "class-1", ...classData, schoolId: 'school-1' });

            const res = await request(app)
                .post('/api/classes')
                .send(classData)
                .expect(201);

            expect(res.body.status).toBe("SUCCESS");
        });
    });
});
