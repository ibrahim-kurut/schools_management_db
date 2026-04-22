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
        academicYear: {
            create: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            update: jest.fn(),
            deleteMany: jest.fn(),
            updateMany: jest.fn(),
        },
        grade: {
            count: jest.fn(),
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

describe('Academic Year System Unit Tests (Mocked)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/academic-year', () => {
        it('should create an academic year', async () => {
            const yearData = { name: "2024-2025", startDate: "2024-09-01", endDate: "2025-06-01" };
            prisma.school.findUnique.mockResolvedValue({ id: "test-school-id" });
            prisma.academicYear.findFirst.mockResolvedValue(null);
            prisma.academicYear.create.mockResolvedValue({ id: "year-1", ...yearData });

            const res = await request(app)
                .post('/api/academic-year')
                .send(yearData)
                .expect(201);

            expect(res.body.academicYear).toBeDefined();
        });
    });
});
