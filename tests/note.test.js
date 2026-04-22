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
        note: {
            create: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            deleteMany: jest.fn(),
        },
        subject: {
            findFirst: jest.fn(),
        },
        $transaction: jest.fn((callback) => callback(mockPrisma)),
        $disconnect: jest.fn()
    };
    return mockPrisma;
});

describe('Note System Unit Tests (Mocked)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/notes', () => {
        it('should create a note', async () => {
            const validUuid = "550e8400-e29b-41d4-a716-446655440000";
            const noteData = { content: "Hello World", classId: validUuid };
            
            prisma.subject.findFirst.mockResolvedValue({ id: "sub-1" });
            prisma.note.create.mockResolvedValue({ id: "1", ...noteData, teacherId: 'user-1' });

            const res = await request(app)
                .post('/api/notes')
                .send(noteData);
            
            if (res.status !== 201) console.log('DEBUG Error:', res.body);
            expect(res.status).toBe(201);

            expect(res.body.data.content).toBe(noteData.content);
        });
    });
});
