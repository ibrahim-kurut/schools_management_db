const {
    createScheduleService,
    getAllSchedulesService,
    deleteScheduleService,
    bulkSyncScheduleService
} = require('../src/services/scheduleService');
const prisma = require('../src/utils/prisma');
const redis = require('../src/config/redis');

jest.mock('../src/utils/prisma', () => ({
    class: { findFirst: jest.fn() },
    subject: { findFirst: jest.fn() },
    user: { findFirst: jest.fn() },
    schedule: {
        findMany: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
    },
    $transaction: jest.fn(async (cb) => {
        // Mock $transaction by executing the callback with the mocked prisma client
        return cb(prisma);
    }),
}));

jest.mock('../src/config/redis', () => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
}));

describe('Schedule Service Tests', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createScheduleService', () => {
        const schoolId = 1;
        const reqData = {
            day: 'MONDAY',
            startTime: '08:00',
            endTime: '09:00',
            classId: 1,
            subjectId: 1,
            teacherId: 1
        };

        it('should create schedule successfully', async () => {
            prisma.class.findFirst.mockResolvedValue({ id: 1 });
            prisma.subject.findFirst.mockResolvedValue({ id: 1 });
            prisma.user.findFirst.mockResolvedValue({ id: 1 });
            prisma.schedule.findMany.mockResolvedValue([]); // No conflicts

            prisma.schedule.create.mockResolvedValue({ id: 1, ...reqData });

            const result = await createScheduleService(schoolId, reqData);

            expect(result.id).toBe(1);
            expect(prisma.schedule.create).toHaveBeenCalled();
            expect(redis.del).toHaveBeenCalled();
        });

        it('should throw error if startTime >= endTime', async () => {
            await expect(createScheduleService(schoolId, { ...reqData, startTime: '09:00' }))
                .rejects.toThrow('وقت البداية يجب أن يكون قبل وقت النهاية.');
        });

        it('should throw error if class does not exist', async () => {
            prisma.class.findFirst.mockResolvedValue(null);
            await expect(createScheduleService(schoolId, reqData))
                .rejects.toThrow('الصف غير موجود أو لا ينتمي لهذه المدرسة.');
        });
    });

    describe('getAllSchedulesService', () => {
        const schoolId = 1;

        it('should return from cache', async () => {
            const cached = [{ id: 1 }];
            redis.get.mockResolvedValue(JSON.stringify(cached));

            const result = await getAllSchedulesService(schoolId);
            expect(result).toEqual(cached);
            expect(prisma.schedule.findMany).not.toHaveBeenCalled();
        });

        it('should return from DB and cache', async () => {
            redis.get.mockResolvedValue(null);
            prisma.schedule.findMany.mockResolvedValue([{ id: 1 }]);

            const result = await getAllSchedulesService(schoolId);
            expect(result.length).toBe(1);
            expect(redis.set).toHaveBeenCalled();
        });
    });

    describe('deleteScheduleService', () => {
        const schoolId = 1;

        it('should delete schedule successfully', async () => {
            prisma.schedule.findFirst.mockResolvedValue({ id: 1, classId: 1 });
            prisma.schedule.delete.mockResolvedValue({ id: 1 });

            const result = await deleteScheduleService(schoolId, 1);
            expect(result.message).toBe('تم حذف الحصة بنجاح.');
            expect(prisma.schedule.delete).toHaveBeenCalledWith({ where: { id: 1 } });
            expect(redis.del).toHaveBeenCalled();
        });
    });

    describe('bulkSyncScheduleService', () => {
        const schoolId = 1;
        const classId = 1;
        const day = 'MONDAY';
        const items = [
            { startTime: '08:00', endTime: '09:00', subjectId: 1, teacherId: 1 }
        ];

        it('should delete all existing and create new ones', async () => {
            prisma.schedule.deleteMany.mockResolvedValue({ count: 1 });
            prisma.schedule.findFirst.mockResolvedValue(null); // No teacher conflict
            prisma.schedule.create.mockResolvedValue({ id: 1, ...items[0] });

            const result = await bulkSyncScheduleService(schoolId, classId, day, items);

            expect(result.length).toBe(1);
            expect(prisma.schedule.deleteMany).toHaveBeenCalledWith({
                where: { schoolId, classId, day }
            });
            expect(prisma.schedule.create).toHaveBeenCalled();
            expect(redis.del).toHaveBeenCalled();
        });
    });
});
