const {
    createClassService,
    getAllClassesService,
    getClassStudentsService,
    getClassByIdService,
    updateClassService,
    deleteClassService
} = require('../src/services/classesService');
const prisma = require('../src/utils/prisma');
const redis = require('../src/config/redis');

// Mock prisma and redis
jest.mock('../src/utils/prisma', () => ({
    school: {
        findUnique: jest.fn(),
    },
    class: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
}));

jest.mock('../src/config/redis', () => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
}));

describe('Classes Service Tests', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createClassService', () => {
        const schoolId = 1;
        const classData = { name: 'Class A', tuitionFee: 1000 };

        it('should create a class successfully', async () => {
            prisma.school.findUnique.mockResolvedValue({ id: schoolId });
            prisma.class.findFirst.mockResolvedValue(null); // No existing class
            prisma.class.create.mockResolvedValue({ ...classData, id: 10, schoolId });

            const result = await createClassService(schoolId, classData);

            expect(result).toEqual({
                status: "SUCCESS",
                message: "Class created successfully",
                class: expect.objectContaining(classData)
            });
            expect(redis.del).toHaveBeenCalledWith(`school:${schoolId}:classes`);
        });

        it('should return NOT_FOUND if school does not exist', async () => {
            prisma.school.findUnique.mockResolvedValue(null);

            const result = await createClassService(schoolId, classData);
            expect(result).toEqual({ status: "NOT_FOUND", message: "School not found" });
        });

        it('should return CONFLICT if class already exists', async () => {
            prisma.school.findUnique.mockResolvedValue({ id: schoolId });
            prisma.class.findFirst.mockResolvedValue({ id: 10 });

            const result = await createClassService(schoolId, classData);
            expect(result).toEqual({ status: "CONFLICT", message: "Class already exists" });
        });
    });

    describe('getAllClassesService', () => {
        const schoolId = 1;

        it('should return classes from cache if available', async () => {
            prisma.school.findUnique.mockResolvedValue({ id: schoolId });
            const cachedClasses = { status: "SUCCESS", classes: [] };
            redis.get.mockResolvedValue(JSON.stringify(cachedClasses));

            const result = await getAllClassesService(schoolId);
            expect(result).toEqual(cachedClasses);
            expect(prisma.class.findMany).not.toHaveBeenCalled();
        });

        it('should fetch classes from db if not in cache', async () => {
            prisma.school.findUnique.mockResolvedValue({ id: schoolId });
            redis.get.mockResolvedValue(null);
            const classes = [{ id: 1, name: 'A' }];
            prisma.class.findMany.mockResolvedValue(classes);

            const result = await getAllClassesService(schoolId);
            expect(result.classes).toEqual(classes);
            expect(redis.set).toHaveBeenCalled();
        });
    });

    describe('getClassStudentsService', () => {
        const schoolId = 1;
        const classId = 10;

        it('should return students of a class', async () => {
            const students = [{ id: 1, firstName: 'Ali' }];
            prisma.class.findFirst.mockResolvedValue({
                id: classId,
                students: students
            });

            const result = await getClassStudentsService(schoolId, classId);
            expect(result.students).toEqual(students);
        });

        it('should return NOT_FOUND if class has no students', async () => {
            prisma.class.findFirst.mockResolvedValue({
                id: classId,
                students: []
            });

            const result = await getClassStudentsService(schoolId, classId);
            expect(result.message).toMatch(/No students found/);
        });
    });

    describe('updateClassService', () => {
        const schoolId = 1;
        const classId = 10;
        const updateData = { name: 'New Name' };

        it('should update class successfully', async () => {
            prisma.class.findFirst.mockResolvedValue({ id: classId });
            prisma.class.update.mockResolvedValue({ id: classId, ...updateData });

            const result = await updateClassService(schoolId, classId, updateData);
            expect(result.status).toBe("SUCCESS");
            expect(redis.del).toHaveBeenCalledTimes(2); // List and item caches
        });
    });

    describe('deleteClassService', () => {
        const schoolId = 1;
        const classId = 10;

        it('should delete class successfully', async () => {
            prisma.class.findFirst.mockResolvedValue({
                id: classId,
                _count: { students: 0 }
            });
            prisma.class.delete.mockResolvedValue({ id: classId });

            const result = await deleteClassService(schoolId, classId);
            expect(result.status).toBe("SUCCESS");
        });

        it('should not delete class if it has students', async () => {
            prisma.class.findFirst.mockResolvedValue({
                id: classId,
                _count: { students: 5 }
            });

            const result = await deleteClassService(schoolId, classId);
            expect(result.status).toBe("NOT_ALLOWED"); // Or whatever status your service returns for this
            expect(prisma.class.delete).not.toHaveBeenCalled();
        });
    });
});
