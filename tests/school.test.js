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
        school: {
            create: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            deleteMany: jest.fn(),
            count: jest.fn(),
        },
        user: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            deleteMany: jest.fn(),
            count: jest.fn(),
        },
        plan: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
        },
        subscription: {
            create: jest.fn(),
        },
        subscriptionRequest: {
            create: jest.fn(),
        },
        class: {
            deleteMany: jest.fn(),
            count: jest.fn(),
        },
        $transaction: jest.fn((callback) => callback(mockPrisma)),
        $disconnect: jest.fn()
    };
    return mockPrisma;
});

describe('School System Unit Tests (Mocked)', () => {
    const schoolAdminToken = ['cookie=mock-admin-token'];
    const superAdminToken = ['cookie=mock-super-token'];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/schools', () => {
        it('should create a new school successfully', async () => {
            const testSchool = { name: "Test School", address: "123 St", phone: "12345" };
            prisma.school.findUnique.mockResolvedValue(null);
            prisma.plan.findFirst.mockResolvedValue({ id: "plan-1", durationInDays: 30, price: 0 });
            prisma.school.create.mockResolvedValue({
                id: "school-uuid",
                ...testSchool,
                slug: "test-school",
                subscription: { plan: { name: "Free" } }
            });

            const res = await request(app)
                .post('/api/schools')
                .send(testSchool)
                .expect(201);

            expect(res.body.school.name).toBe(testSchool.name);
        });
    });

    describe('GET /api/schools', () => {
        it('should get all schools for super admin', async () => {
            prisma.school.findMany.mockResolvedValue([
                { id: "1", name: "School 1", owner: {}, subscription: { plan: {} }, _count: { members: 0 } }
            ]);
            prisma.school.count.mockResolvedValue(1);

            const res = await request(app)
                .get('/api/schools')
                .expect(200);

            expect(res.body.schools.length).toBe(1);
        });
    });
});