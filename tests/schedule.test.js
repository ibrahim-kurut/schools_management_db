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
        schedule: {
            create: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            deleteMany: jest.fn(),
        },
        class: { findFirst: jest.fn(), findUnique: jest.fn() },
        subject: { findFirst: jest.fn(), findUnique: jest.fn() },
        user: { findFirst: jest.fn(), findUnique: jest.fn() },
        $transaction: jest.fn((callback) => callback(mock)),
        $disconnect: jest.fn()
    };
    return mock;
});

const prisma = require('../src/utils/prisma');

describe('Schedule System Unit Tests (Mocked)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/schedules', () => {
        it('should create a schedule successfully', async () => {
            const scheduleData = { 
                classId: "550e8400-e29b-41d4-a716-446655440000", 
                subjectId: "550e8400-e29b-41d4-a716-446655440001",
                teacherId: "550e8400-e29b-41d4-a716-446655440002",
                day: "MONDAY",
                startTime: "08:00",
                endTime: "09:00"
            };
            
            prisma.class.findFirst.mockResolvedValue({ id: scheduleData.classId });
            prisma.subject.findFirst.mockResolvedValue({ id: scheduleData.subjectId });
            prisma.user.findFirst.mockResolvedValue({ id: scheduleData.teacherId });
            prisma.schedule.findMany.mockResolvedValue([]);
            prisma.schedule.create.mockResolvedValue({ id: "sch-1", ...scheduleData });

            const res = await request(app)
                .post('/api/schedules')
                .send(scheduleData)
                .expect(201);

            expect(res.body.success).toBe(true);
        });
    });
});
