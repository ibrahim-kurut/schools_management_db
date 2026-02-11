const {
    createAcademicYearService,
    getAcademicYearsService,
    getAcademicYearByIdService,
    updateAcademicYearService,
    deleteAcademicYearService
} = require('../src/services/academicYearService');
const prisma = require('../src/utils/prisma');
const redis = require('../src/config/redis');

// Mock prisma and redis
jest.mock('../src/utils/prisma', () => ({
    school: {
        findUnique: jest.fn(),
    },
    academicYear: {
        findFirst: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
    },
}));

jest.mock('../src/config/redis', () => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
}));

describe('Academic Year Service Tests', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createAcademicYearService', () => {
        const schoolId = 1;
        const reqData = { name: '2023-2024', startDate: '2023-09-01', endDate: '2024-06-01', isCurrent: true };

        it('should create academic year successfully', async () => {
            prisma.school.findUnique.mockResolvedValue({ id: schoolId });
            prisma.academicYear.findFirst.mockResolvedValue(null);
            prisma.academicYear.create.mockResolvedValue({ ...reqData, id: 1, schoolId });

            const result = await createAcademicYearService(schoolId, reqData);

            expect(result.status).toBe("SUCCESS");
            expect(prisma.academicYear.create).toHaveBeenCalled();
            expect(prisma.academicYear.updateMany).toHaveBeenCalled(); // Since isCurrent is true
            expect(redis.del).toHaveBeenCalled();
        });

        it('should return CONFLICT if academic year exists', async () => {
            prisma.school.findUnique.mockResolvedValue({ id: schoolId });
            prisma.academicYear.findFirst.mockResolvedValue({ id: 1 });

            const result = await createAcademicYearService(schoolId, reqData);
            expect(result.status).toBe("CONFLICT");
        });
    });

    describe('getAcademicYearsService', () => {
        const schoolId = 1;

        it('should return academic years from cache', async () => {
            prisma.school.findUnique.mockResolvedValue({ id: schoolId });
            const cachedData = { status: "SUCCESS", academicYears: [] };
            redis.get.mockResolvedValue(JSON.stringify(cachedData));

            const result = await getAcademicYearsService(schoolId);
            expect(result).toEqual(cachedData);
            expect(prisma.academicYear.findMany).not.toHaveBeenCalled();
        });

        it('should return academic years from db', async () => {
            prisma.school.findUnique.mockResolvedValue({ id: schoolId });
            redis.get.mockResolvedValue(null);
            prisma.academicYear.findMany.mockResolvedValue([]);
            prisma.academicYear.count.mockResolvedValue(0);

            const result = await getAcademicYearsService(schoolId);
            expect(result.status).toBe("SUCCESS");
            expect(redis.set).toHaveBeenCalled();
        });
    });

    describe('getAcademicYearByIdService', () => {
        const schoolId = 1;
        const academicYearId = 1;

        it('should return academic year', async () => {
            prisma.school.findUnique.mockResolvedValue({ id: schoolId });
            redis.get.mockResolvedValue(null);
            prisma.academicYear.findUnique.mockResolvedValue({ id: academicYearId });

            const result = await getAcademicYearByIdService(schoolId, academicYearId);
            expect(result.status).toBe("SUCCESS");
        });

        it('should return NOT_FOUND if not exists', async () => {
            prisma.school.findUnique.mockResolvedValue({ id: schoolId });
            redis.get.mockResolvedValue(null);
            prisma.academicYear.findUnique.mockResolvedValue(null);

            const result = await getAcademicYearByIdService(schoolId, academicYearId);
            expect(result.status).toBe("NOT_FOUND");
        });
    });

    describe('updateAcademicYearService', () => {
        const schoolId = 1;
        const academicYearId = 1;
        const reqData = { name: 'New Name' };

        it('should update academic year successfully', async () => {
            prisma.school.findUnique.mockResolvedValue({ id: schoolId });
            prisma.academicYear.findUnique.mockResolvedValue({
                id: academicYearId,
                schoolId: schoolId,
                startDate: new Date('2023-01-01'),
                endDate: new Date('2024-01-01')
            });
            prisma.academicYear.findFirst.mockResolvedValue(null); // Explicitly return null for conflict check
            prisma.academicYear.update.mockResolvedValue({ id: academicYearId, ...reqData });

            const result = await updateAcademicYearService(schoolId, academicYearId, reqData);
            expect(result.status).toBe("SUCCESS");
            expect(redis.del).toHaveBeenCalledTimes(2);
        });
    });

    describe('deleteAcademicYearService', () => {
        const schoolId = 1;
        const academicYearId = 1;

        it('should delete (soft delete) academic year successfully', async () => {
            prisma.school.findUnique.mockResolvedValue({ id: schoolId });
            prisma.academicYear.findUnique.mockResolvedValue({ id: academicYearId, schoolId, name: "Old" });
            prisma.academicYear.update.mockResolvedValue({ id: academicYearId, isDeleted: true });

            const result = await deleteAcademicYearService(schoolId, academicYearId);
            expect(result.status).toBe("SUCCESS");
            expect(prisma.academicYear.update).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: academicYearId }, data: expect.objectContaining({ isDeleted: true }) })
            );
        });
    });
});
