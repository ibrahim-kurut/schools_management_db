const request = require('supertest');
jest.mock('../src/middleware/rateLimiter', () => ({
    globalLimiter: (req, res, next) => next(),
    authLimiter: (req, res, next) => next()
}));

const app = require('../src/app');
const bcrypt = require('bcryptjs');

// Mock Supabase
jest.mock('../src/config/supabaseClient', () => ({
    storage: {
        from: jest.fn().mockReturnThis(),
        upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'http://mock.url' } }),
    }
}));

// Robust Prisma Mock
jest.mock('../src/utils/prisma', () => {
    const mock = {
        user: {
            findFirst: jest.fn(),
            create: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        school: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
        },
        $transaction: jest.fn((callback) => callback(mock)),
    };
    return mock;
});

const prisma = require('../src/utils/prisma');

describe('Auth System Unit Tests (Mocked)', () => {
    const testUser = {
        id: "user-uuid",
        firstName: "Test",
        lastName: "User",
        email: "test_jest_user@example.com",
        password: "password123",
        phone: "0770000000",
        gender: "MALE",
        birthDate: "1990-01-01",
        role: "USER",
        schoolId: "school-uuid",
        school: { slug: "test-school", name: "Test School", logo: null },
        ownedSchool: null
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            prisma.user.findUnique.mockResolvedValue(null);
            prisma.user.findFirst.mockResolvedValue(null);
            prisma.user.create.mockResolvedValue({
                ...testUser,
                password: "hashed_password"
            });

            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    firstName: testUser.firstName,
                    lastName: testUser.lastName,
                    email: testUser.email,
                    password: testUser.password,
                    phone: testUser.phone,
                    gender: testUser.gender,
                    birthDate: testUser.birthDate
                });

            expect(res.status).toBe(201);
            expect(res.body.user.email).toBe(testUser.email);
        });
    });
});