const request = require('supertest');
jest.mock('../src/middleware/rateLimiter', () => ({
    globalLimiter: (req, res, next) => next(),
    authLimiter: (req, res, next) => next()
}));

const app = require('../src/app');
const prisma = require('../src/utils/prisma');

// Mock Prisma
jest.mock('../src/utils/prisma', () => ({
    academicYear: {
        findUnique: jest.fn(),
        update: jest.fn(),
    },
    $disconnect: jest.fn()
}));

describe('Archive System Unit Tests (Mocked)', () => {
    const superToken = ['cookie=mock-super-token'];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/archive/academic-year/:id', () => {
        it('should archive an academic year', async () => {
            prisma.academicYear.findUnique.mockResolvedValue({ id: "1", isArchived: false });
            prisma.academicYear.update.mockResolvedValue({ id: "1", isArchived: true });

            const res = await request(app)
                .post('/api/archive/academic-year/1')
                .set('Cookie', superToken)
                .expect(200);

            expect(res.body.success).toBe(true);
        });
    });
});
