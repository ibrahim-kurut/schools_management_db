const request = require('supertest');
jest.mock('../src/middleware/rateLimiter', () => ({
    globalLimiter: (req, res, next) => next(),
    authLimiter: (req, res, next) => next()
}));

const app = require('../src/app');
const prisma = require('../src/utils/prisma');

// Mock Prisma
jest.mock('../src/utils/prisma', () => ({
    school: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
    },
    user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
    },
    class: {
        deleteMany: jest.fn(),
    },
    $disconnect: jest.fn()
}));

describe('School System Unit Tests (Mocked)', () => {
    const schoolAdminToken = ['cookie=mock-admin-token'];
    const superAdminToken = ['cookie=mock-super-token'];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/schools', () => {
        it('should create a new school successfully', async () => {
            const testSchool = { name: "Test School", address: "123 St" };
            prisma.school.create.mockResolvedValue({
                id: "school-uuid",
                ...testSchool,
                slug: "test-school"
            });

            const res = await request(app)
                .post('/api/schools')
                .set('Cookie', schoolAdminToken)
                .send(testSchool)
                .expect(201);

            expect(res.body.school.name).toBe(testSchool.name);
            expect(prisma.school.create).toHaveBeenCalled();
        });
    });

    describe('GET /api/schools', () => {
        it('should get all schools for super admin', async () => {
            prisma.school.findMany.mockResolvedValue([
                { id: "1", name: "School 1" }
            ]);

            const res = await request(app)
                .get('/api/schools')
                .set('Cookie', superAdminToken)
                .expect(200);

            expect(res.body.schools.length).toBe(1);
        });
    });
});