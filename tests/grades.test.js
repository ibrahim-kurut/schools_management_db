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

// Mock gradeCalculations
jest.mock('../src/services/gradeCalculations', () => ({
    calculateAveragesIfNeeded: jest.fn().mockResolvedValue(true)
}));

// Robust Prisma Mock
jest.mock('../src/utils/prisma', () => {
    const mock = {
        grade: {
            create: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findFirst: jest.fn(),
        },
        user: { findFirst: jest.fn(), findUnique: jest.fn() },
        subject: { findFirst: jest.fn(), findUnique: jest.fn() },
        academicYear: { findFirst: jest.fn(), findUnique: jest.fn() },
        $transaction: jest.fn((callback) => callback(mock)),
        $disconnect: jest.fn()
    };
    return mock;
});

const prisma = require('../src/utils/prisma');

describe('Grades Management Unit Tests (Mocked)', () => {
    const studentId = "550e8400-e29b-41d4-a716-446655440000";
    const subjectId = "550e8400-e29b-41d4-a716-446655440001";
    const academicYearId = "550e8400-e29b-41d4-a716-446655440002";
    const classId = "550e8400-e29b-41d4-a716-446655440003";

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/grades', () => {
        it('should record a grade successfully', async () => {
            const gradeData = {
                studentId,
                subjectId,
                academicYearId,
                examType: "OCTOBER",
                score: 85
            };

            prisma.academicYear.findFirst.mockResolvedValue({ id: academicYearId });
            prisma.subject.findFirst.mockResolvedValue({ 
                id: subjectId, 
                class: { id: classId },
                teacherId: "teacher-id"
            });
            prisma.user.findFirst.mockResolvedValue({ id: studentId, classId: classId });
            
            prisma.grade.create.mockResolvedValue({ 
                id: "grade-1", 
                ...gradeData,
                student: { firstName: "S", lastName: "T" },
                subject: { name: "Sub" },
                academicYear: { name: "Year" }
            });

            const res = await request(app)
                .post('/api/grades')
                .send(gradeData)
                .expect(201);

            expect(res.body.success).toBe(true);
        });
    });
});
