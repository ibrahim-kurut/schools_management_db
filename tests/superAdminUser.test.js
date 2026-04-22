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
            update: jest.fn(),
            delete: jest.fn(),
            deleteMany: jest.fn(),
            count: jest.fn(),
        },
        $transaction: jest.fn((callback) => callback(mockPrisma)),
        $disconnect: jest.fn()
    };
    return mockPrisma;
});

describe('SuperAdmin User Management Unit Tests (Mocked)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/superadmin/users', () => {
        it('should fetch all users for super admin', async () => {
            prisma.user.findMany.mockResolvedValue([{ id: "user-1", role: "SCHOOL_ADMIN" }]);
            prisma.user.count.mockResolvedValue(1);

            const res = await request(app)
                .get('/api/admin/users')
                .expect(200);

            expect(res.body.users.length).toBe(1);
        });
    });
});
