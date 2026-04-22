const request = require('supertest');
jest.mock('../src/middleware/rateLimiter', () => ({
    globalLimiter: (req, res, next) => next(),
    authLimiter: (req, res, next) => next()
}));

const app = require('../src/app');
const prisma = require('../src/utils/prisma');

// Mock Prisma
jest.mock('../src/utils/prisma', () => ({
    user: {
        findUnique: jest.fn(),
        update: jest.fn(),
    },
    $disconnect: jest.fn()
}));

describe('Profile System Unit Tests (Mocked)', () => {
    const userToken = ['cookie=mock-user-token'];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/profile', () => {
        it('should fetch user profile', async () => {
            prisma.user.findUnique.mockResolvedValue({ id: "1", firstName: "John" });

            const res = await request(app)
                .get('/api/profile')
                .set('Cookie', userToken)
                .expect(200);

            expect(res.body.user.firstName).toBe("John");
        });
    });
});
