const {
    getArchivedDataService,
    restoreDataService,
    permanentDeleteService
} = require('../src/services/archiveService');
const prisma = require('../src/utils/prisma');
const redis = require('../src/config/redis');

// Mock prisma and redis
jest.mock('../src/utils/prisma', () => ({
    class: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    subject: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    academicYear: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    grade: {
        count: jest.fn(),
    }
}));

jest.mock('../src/config/redis', () => ({
    del: jest.fn(),
}));

describe('Archive Service Tests', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getArchivedDataService', () => {
        it('should return archived data successfully', async () => {
            const schoolId = 1;
            
            prisma.class.findMany.mockResolvedValue([{ id: 1, name: 'Class 1', deletedAt: new Date() }]);
            prisma.subject.findMany.mockResolvedValue([{ id: 1, name: 'Subject 1', deletedAt: new Date(), class: { name: 'Class 1' } }]);
            prisma.academicYear.findMany.mockResolvedValue([{ id: 1, name: 'Year 1', deletedAt: new Date() }]);

            const result = await getArchivedDataService(schoolId);

            expect(result.status).toBe("SUCCESS");
            expect(result.data.classes.length).toBe(1);
            expect(result.data.subjects.length).toBe(1);
            expect(result.data.academicYears.length).toBe(1);
        });
    });

    describe('restoreDataService', () => {
        const schoolId = 1;

        it('should restore a class successfully', async () => {
            const id = 1;
            prisma.class.findFirst
                .mockResolvedValueOnce({ id, name: 'Class 1_deleted_123', schoolId }) // find class to restore
                .mockResolvedValueOnce(null); // existing class check

            prisma.class.update.mockResolvedValue({ id, name: 'Class 1', isDeleted: false });

            const result = await restoreDataService(schoolId, 'class', id);

            expect(result.status).toBe("SUCCESS");
            expect(prisma.class.update).toHaveBeenCalled();
            expect(redis.del).toHaveBeenCalled();
        });

        it('should return error if class name conflict exists during restore', async () => {
            const id = 1;
            prisma.class.findFirst
                .mockResolvedValueOnce({ id, name: 'Class 1_deleted_123', schoolId }) // find class to restore
                .mockResolvedValueOnce({ id: 2, name: 'Class 1' }); // existing class check conflict

            const result = await restoreDataService(schoolId, 'class', id);

            expect(result.status).toBe("ERROR");
            expect(prisma.class.update).not.toHaveBeenCalled();
        });
        
        it('should return error for invalid type', async () => {
            const result = await restoreDataService(schoolId, 'invalid_type', 1);
            expect(result.status).toBe("ERROR");
        });
    });

    describe('permanentDeleteService', () => {
        const schoolId = 1;

        it('should permanently delete a class successfully', async () => {
            const id = 1;
            prisma.class.findFirst.mockResolvedValue({ id, schoolId, _count: { students: 0 } });
            prisma.class.delete.mockResolvedValue({ id });

            const result = await permanentDeleteService(schoolId, 'class', id);

            expect(result.status).toBe("SUCCESS");
            expect(prisma.class.delete).toHaveBeenCalledWith({ where: { id } });
        });

        it('should not delete class if it has students attached', async () => {
            const id = 1;
            prisma.class.findFirst.mockResolvedValue({ id, schoolId, _count: { students: 5 } });

            const result = await permanentDeleteService(schoolId, 'class', id);

            expect(result.status).toBe("ERROR");
            expect(prisma.class.delete).not.toHaveBeenCalled();
        });

        it('should permanently delete a subject successfully', async () => {
            const id = 1;
            prisma.grade.count.mockResolvedValue(0);
            prisma.subject.delete.mockResolvedValue({ id });

            const result = await permanentDeleteService(schoolId, 'subject', id);

            expect(result.status).toBe("SUCCESS");
            expect(prisma.subject.delete).toHaveBeenCalled();
        });
    });
});
