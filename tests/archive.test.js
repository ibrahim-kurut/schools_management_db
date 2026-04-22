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
    quit: jest.fn(),
}));

// Robust Prisma Mock
jest.mock('../src/utils/prisma', () => {
    const mock = {
        academicYear: {
            findUnique: jest.fn(),
            update: jest.fn(),
            findFirst: jest.fn(),
        },
        class: { findFirst: jest.fn() },
        subject: { findFirst: jest.fn() },
        $transaction: jest.fn((callback) => callback(mock)),
        $disconnect: jest.fn()
    };
    return mock;
});

const prisma = require('../src/utils/prisma');

describe('Archive System Unit Tests (Mocked)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/archive/restore', () => {
        it('should restore an academic year', async () => {
            // First call finds the archived year
            prisma.academicYear.findFirst.mockResolvedValueOnce({ id: "year-1", isArchived: true, name: "2024_deleted_123" });
            // Second call checks for conflict (should be null)
            prisma.academicYear.findFirst.mockResolvedValueOnce(null);
            
            prisma.academicYear.update.mockResolvedValue({ id: "year-1", isArchived: false, name: "2024" });

            const res = await request(app)
                .post('/api/archive/restore')
                .send({ type: 'academicYear', id: 'year-1' })
                .expect(200);

            expect(res.body.status).toBe("SUCCESS");
        });
    });
});
