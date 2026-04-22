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
        subject: {
            create: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            deleteMany: jest.fn(),
        },
        school: {
            findUnique: jest.fn(),
        },
        $transaction: jest.fn((callback) => callback(mockPrisma)),
        $disconnect: jest.fn()
    };
    return mockPrisma;
});

describe('Subject Management Unit Tests (Mocked)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/subjects', () => {
        it('should create a new subject', async () => {
            const subjectData = { name: "Mathematics", code: "MATH101" };
            prisma.subject.create.mockResolvedValue({ id: "sub-1", ...subjectData, schoolId: 'school-1' });

            const res = await request(app)
                .post('/api/subjects')
                .send(subjectData)
                .expect(201);

            expect(res.body.subject.name).toBe(subjectData.name);
        });
    });
});
