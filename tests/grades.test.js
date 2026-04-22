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
        grade: {
            create: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            deleteMany: jest.fn(),
        },
        user: { findUnique: jest.fn() },
        subject: { findUnique: jest.fn() },
        academicYear: { findUnique: jest.fn() },
        $transaction: jest.fn((callback) => callback(mockPrisma)),
        $disconnect: jest.fn()
    };
    return mockPrisma;
});

describe('Grades Management Unit Tests (Mocked)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/grades', () => {
        it('should record a grade successfully', async () => {
            const gradeData = { studentId: "stud-1", subjectId: "sub-1", score: 85, academicYearId: "year-1" };
            prisma.grade.create.mockResolvedValue({ id: "grade-1", ...gradeData });
            prisma.user.findUnique.mockResolvedValue({ id: "stud-1", role: "STUDENT" });
            prisma.subject.findUnique.mockResolvedValue({ id: "sub-1" });
            prisma.academicYear.findUnique.mockResolvedValue({ id: "year-1" });

            const res = await request(app)
                .post('/api/grades')
                .send(gradeData)
                .expect(201);

            expect(res.body.status).toBe("SUCCESS");
        });
    });
});
