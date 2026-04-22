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

// Robust Prisma Mock
jest.mock('../src/utils/prisma', () => {
    const mock = {
        user: {
            create: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findFirst: jest.fn(),
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

describe('School User Management Unit Tests (Mocked)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/school-user', () => {
        it('should create a school user (Teacher) successfully', async () => {
            const userData = {
                firstName: "Teacher",
                lastName: "One",
                email: "teacher1@school.com",
                password: "password123",
                role: "TEACHER",
                gender: "MALE",
                birthDate: "1990-01-01"
            };

            prisma.school.findUnique.mockResolvedValue({ 
                id: "school-1", 
                subscription: { status: "ACTIVE", plan: { maxTeachers: 10 } },
                classes: []
            });
            prisma.user.findUnique.mockResolvedValue(null);
            prisma.user.findFirst.mockResolvedValue(null);
            prisma.user.count.mockResolvedValue(0);
            prisma.user.create.mockResolvedValue({ id: "user-1", ...userData });

            const res = await request(app)
                .post('/api/school-user')
                .send(userData)
                .expect(201);

            expect(res.body.user.email).toBe(userData.email);
        });
    });
});
