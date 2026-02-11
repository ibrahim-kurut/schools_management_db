const {
    createSubjectService,
    getAllSubjectsService,
    getSubjectByIdService,
    updateSubjectService,
    deleteSubjectService
} = require('../src/services/subjectsService');
const prisma = require('../src/utils/prisma');
const redis = require('../src/config/redis');

// Mock prisma and redis
jest.mock('../src/utils/prisma', () => ({
    class: {
        findFirst: jest.fn(),
    },
    subject: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    user: {
        findFirst: jest.fn(),
    }
}));

jest.mock('../src/config/redis', () => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
}));

describe('Subjects Service Tests', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createSubjectService', () => {
        const schoolId = 1;
        const reqData = { name: 'Math', classId: 10, teacherId: 5 };

        it('should create a subject successfully', async () => {
            prisma.class.findFirst.mockResolvedValue({ id: 10, schoolId });
            prisma.subject.findFirst.mockResolvedValue(null); // No duplicates
            prisma.user.findFirst.mockResolvedValue({ id: 5, role: 'TEACHER' });
            prisma.subject.create.mockResolvedValue({ ...reqData, id: 100 });

            const result = await createSubjectService(schoolId, reqData);

            expect(result).toHaveProperty('id', 100);
            expect(prisma.subject.create).toHaveBeenCalled();
            expect(redis.del).toHaveBeenCalled();
        });

        it('should throw error if class not found', async () => {
            prisma.class.findFirst.mockResolvedValue(null);

            await expect(createSubjectService(schoolId, reqData))
                .rejects.toHaveProperty('statusCode', 404);
        });

        it('should throw error if subject already exists', async () => {
            prisma.class.findFirst.mockResolvedValue({ id: 10 });
            prisma.subject.findFirst.mockResolvedValue({ id: 99 });

            await expect(createSubjectService(schoolId, reqData))
                .rejects.toHaveProperty('statusCode', 409);
        });
    });

    describe('getAllSubjectsService', () => {
        const schoolId = 1;

        it('should return subjects from cache', async () => {
            const cachedData = [{ id: 1, name: 'Math' }];
            redis.get.mockResolvedValue(JSON.stringify(cachedData));

            const result = await getAllSubjectsService(schoolId);
            expect(result).toEqual(cachedData);
        });

        it('should return subjects from db', async () => {
            redis.get.mockResolvedValue(null);
            prisma.subject.findMany.mockResolvedValue([{ id: 1 }]);

            const result = await getAllSubjectsService(schoolId);
            expect(result).toHaveLength(1);
            expect(redis.set).toHaveBeenCalled();
        });
    });

    describe('getSubjectByIdService', () => {
        const schoolId = 1;
        const subjectId = 100;

        it('should return subject', async () => {
            redis.get.mockResolvedValue(null);
            prisma.subject.findFirst.mockResolvedValue({ id: subjectId });

            const result = await getSubjectByIdService(schoolId, subjectId);
            expect(result).toHaveProperty('id', subjectId);
        });
    });

    describe('updateSubjectService', () => {
        const schoolId = 1;
        const subjectIdValue = { id: 100 };
        const reqData = { name: 'New Math', classId: 10 };

        it('should update subject successfully', async () => {
            prisma.subject.findFirst.mockResolvedValueOnce({
                id: 100,
                name: 'Math',
                classId: 10
            }); // existingSubject
            prisma.subject.findFirst.mockResolvedValueOnce(null); // nameConflict
            prisma.subject.update.mockResolvedValue({ id: 100, name: 'New Math' });

            const result = await updateSubjectService(schoolId, subjectIdValue, reqData);
            expect(result.name).toBe('New Math');
            expect(redis.del).toHaveBeenCalledTimes(2);
        });

        it('should throw error if moving class', async () => {
            prisma.subject.findFirst.mockResolvedValue({
                id: 100,
                classId: 10
            });

            await expect(updateSubjectService(schoolId, subjectIdValue, { ...reqData, classId: 11 }))
                .rejects.toHaveProperty('statusCode', 400);
        });
    });

    describe('deleteSubjectService', () => {
        const schoolId = 1;
        const subjectIdValue = { id: 100 };

        it('should delete subject successfully', async () => {
            prisma.subject.findFirst.mockResolvedValue({ id: 100 });
            prisma.subject.delete.mockResolvedValue({ id: 100 });

            const result = await deleteSubjectService(schoolId, subjectIdValue);
            expect(result.id).toBe(100);
            expect(redis.del).toHaveBeenCalledTimes(2);
        });
    });
});
