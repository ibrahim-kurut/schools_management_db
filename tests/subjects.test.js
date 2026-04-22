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
        subject: {
            create: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findFirst: jest.fn(),
        },
        class: { findFirst: jest.fn(), findUnique: jest.fn() },
        $transaction: jest.fn((callback) => callback(mock)),
        $disconnect: jest.fn()
    };
    return mock;
});

const prisma = require('../src/utils/prisma');

describe('Subject Management Unit Tests (Mocked)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/subjects', () => {
        it('should create a new subject', async () => {
            const subjectData = { 
                name: "Mathematics", 
                classId: "550e8400-e29b-41d4-a716-446655440000" 
            };
            
            prisma.class.findFirst.mockResolvedValue({ id: subjectData.classId });
            prisma.subject.findFirst.mockResolvedValue(null);
            prisma.subject.create.mockResolvedValue({ 
                id: "sub-1", 
                ...subjectData,
                class: { name: "Grade 10" },
                teacher: null
            });

            const res = await request(app)
                .post('/api/subjects')
                .send(subjectData)
                .expect(201);

            expect(res.body.newSubject.name).toBe(subjectData.name);
        });
    });
});
