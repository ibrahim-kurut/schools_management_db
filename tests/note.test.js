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
        note: {
            create: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        subject: {
            findFirst: jest.fn(),
        },
        $transaction: jest.fn((callback) => callback(mock)),
        $disconnect: jest.fn()
    };
    return mock;
});

const prisma = require('../src/utils/prisma');

describe('Notes System Unit Tests (Mocked)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/notes', () => {
        it('should create a new note', async () => {
            const noteData = { 
                classId: "550e8400-e29b-41d4-a716-446655440000", 
                content: "Good progress" 
            };
            
            prisma.subject.findFirst.mockResolvedValue({ id: "sub-1" });
            prisma.note.create.mockResolvedValue({ 
                id: "note-1", 
                ...noteData,
                teacher: { firstName: "Teacher", lastName: "Test", image: null }
            });

            const res = await request(app)
                .post('/api/notes')
                .send(noteData)
                .expect(201);

            expect(res.body.success).toBe(true);
        });
    });
});
