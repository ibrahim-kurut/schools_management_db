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
        class: {
            create: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findFirst: jest.fn(),
        },
        school: {
            findUnique: jest.fn(),
        },
        $transaction: jest.fn((callback) => callback(mock)),
        $disconnect: jest.fn()
    };
    return mock;
});

const prisma = require('../src/utils/prisma');

describe('Class System Unit Tests (Mocked)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/classes', () => {
        it('should create a new class', async () => {
            const classData = { name: "Grade 10A", tuitionFee: 500000 };
            prisma.school.findUnique.mockResolvedValue({ id: "test-school-id" });
            prisma.class.findFirst.mockResolvedValue(null);
            prisma.class.create.mockResolvedValue({ 
                id: "class-1", 
                ...classData,
                _count: { students: 0 }
            });

            const res = await request(app)
                .post('/api/classes')
                .send(classData)
                .expect(201);

            expect(res.body.class).toBeDefined();
        });
    });
});
