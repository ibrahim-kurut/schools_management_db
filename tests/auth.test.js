const request = require('supertest');
jest.mock('../src/middleware/rateLimiter', () => ({
    globalLimiter: (req, res, next) => next(),
    authLimiter: (req, res, next) => next()
}));

const app = require('../src/app');
const prisma = require('../src/utils/prisma');
const bcrypt = require('bcryptjs');

// Mock Supabase
jest.mock('../src/config/supabaseClient', () => ({
    storage: {
        from: jest.fn().mockReturnThis(),
        upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'http://mock.url' } }),
    }
}));

// Mock Prisma
jest.mock('../src/utils/prisma', () => {
    const mockPrisma = {
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
        $transaction: jest.fn((callback) => callback(mockPrisma)),
    };
    return mockPrisma;
});

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

        it('should fail if email already exists', async () => {
            prisma.user.findUnique.mockResolvedValue(testUser);

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

            // The API returns 500 for thrown Errors in service
            expect(res.status).toBe(500);
            expect(res.body.message).toMatch(/مسجل بالفعل/i);
        });
    });

    describe('POST /api/auth/:slug/login', () => {
        it('should login successfully with correct credentials', async () => {
            const hashedPassword = await bcrypt.hash(testUser.password, 10);
            prisma.school.findUnique.mockResolvedValue({ id: testUser.schoolId, slug: "test-school" });
            prisma.user.findFirst.mockResolvedValue({
                ...testUser,
                password: hashedPassword
            });

            const res = await request(app)
                .post('/api/auth/test-school/login')
                .send({
                    email: testUser.email,
                    password: testUser.password
                })
                .expect(200);

            expect(res.headers['set-cookie']).toBeDefined();
            expect(res.body.userData.email).toBe(testUser.email);
        });

        it('should fail with wrong password', async () => {
            const hashedPassword = await bcrypt.hash("different_password", 10);
            prisma.school.findUnique.mockResolvedValue({ id: testUser.schoolId, slug: "test-school" });
            prisma.user.findFirst.mockResolvedValue({
                ...testUser,
                password: hashedPassword
            });

            const res = await request(app)
                .post('/api/auth/test-school/login')
                .send({
                    email: testUser.email,
                    password: testUser.password
                });

            // The API returns 500 for thrown Errors in service
            expect(res.status).toBe(500);
            expect(res.body.message).toBe("Invalid credentials");
        });
    });
});