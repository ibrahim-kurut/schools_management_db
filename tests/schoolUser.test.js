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
        user: {
            create: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            deleteMany: jest.fn(),
            count: jest.fn(),
        },
        school: {
            findUnique: jest.fn(),
        },
        $transaction: jest.fn((callback) => callback(mockPrisma)),
        $disconnect: jest.fn()
    };
    return mockPrisma;
});

describe('School User Management Unit Tests (Mocked)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/schools/:schoolId/users', () => {
        it('should create a school user (Teacher) successfully', async () => {
            const userData = { firstName: "John", lastName: "Doe", email: "john@test.com", role: "TEACHER" };
            prisma.school.findUnique.mockResolvedValue({ id: 'school-1' });
            prisma.user.create.mockResolvedValue({ id: "user-1", ...userData, schoolId: 'school-1' });

            const res = await request(app)
                .post('/api/schools/school-1/users')
                .send(userData)
                .expect(201);

            expect(res.body.user.email).toBe(userData.email);
        });
    });
});
