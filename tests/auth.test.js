const request = require('supertest');
jest.mock('../src/middleware/rateLimiter', () => ({
    globalLimiter: (req, res, next) => next(),
    authLimiter: (req, res, next) => next()
}));

const app = require('../src/app');
const prisma = require('../src/utils/prisma');
const bcrypt = require('bcryptjs');

// Mock Prisma
jest.mock('../src/utils/prisma', () => ({
    user: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
    },
    school: {
        findUnique: jest.fn(),
    }
}));

describe('Auth System Unit Tests (Mocked)', () => {
    const testUser = {
        id: "user-uuid",
        firstName: "Test",
        lastName: "User",
        email: "test_jest_user@example.com",
        password: "password123",
        role: "USER",
        schoolId: "school-uuid"
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            prisma.user.findUnique.mockResolvedValue(null);
            prisma.user.create.mockResolvedValue({
                ...testUser,
                password: "hashed_password"
            });

            const res = await request(app)
                .post('/api/auth/register')
                .send(testUser)
                .expect(201);

            expect(res.body.user.email).toBe(testUser.email);
            expect(prisma.user.create).toHaveBeenCalled();
        });

        it('should fail if email already exists', async () => {
            prisma.user.findUnique.mockResolvedValue(testUser);

            const res = await request(app)
                .post('/api/auth/register')
                .send(testUser)
                .expect(400);

            expect(res.body.message).toMatch(/exists/i);
        });
    });

    describe('POST /api/auth/login', () => {
        it('should login successfully with correct credentials', async () => {
            const hashedPassword = await bcrypt.hash(testUser.password, 10);
            prisma.user.findUnique.mockResolvedValue({
                ...testUser,
                password: hashedPassword
            });

            const res = await request(app)
                .post('/api/auth/login')
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
            prisma.user.findUnique.mockResolvedValue({
                ...testUser,
                password: hashedPassword
            });

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password
                })
                .expect(401);

            expect(res.body.message).toBe("Invalid credentials");
        });
    });
});