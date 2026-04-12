const prisma = require("../utils/prisma");
const redis = require("../config/redis");

/**
 * @description Create a new schedule entry
 */
exports.createScheduleService = async (schoolId, reqData) => {
    const { day, startTime, endTime, classId, subjectId, teacherId } = reqData;

    // 1. Basic Validation
    if (startTime >= endTime) {
        const error = new Error("وقت البداية يجب أن يكون قبل وقت النهاية.");
        error.statusCode = 400;
        throw error;
    }

    // 2. Check if class, subject, and teacher exist and belong to the school
    const classExists = await prisma.class.findFirst({ where: { id: classId, schoolId } });
    if (!classExists) {
        const error = new Error("الصف غير موجود أو لا ينتمي لهذه المدرسة.");
        error.statusCode = 404;
        throw error;
    }

    const subjectExists = await prisma.subject.findFirst({ where: { id: subjectId, classId } });
    if (!subjectExists) {
        const error = new Error("المادة غير موجودة في هذا الصف.");
        error.statusCode = 404;
        throw error;
    }

    const teacherExists = await prisma.user.findFirst({ where: { id: teacherId, schoolId, role: "TEACHER" } });
    if (!teacherExists) {
        const error = new Error("المعلم غير موجود أو لا ينتمي لهذه المدرسة.");
        error.statusCode = 404;
        throw error;
    }

    // 3. Conflict Check (Teacher & Class) within the SAME school
    const existingSchedules = await prisma.schedule.findMany({
        where: {
            schoolId,
            day,
        }
    });

    for (const schedule of existingSchedules) {
        // Overlap logic: (s1 < e2) && (e1 > s2)
        const isOverlapping = (startTime < schedule.endTime) && (endTime > schedule.startTime);
        
        if (isOverlapping) {
            if (schedule.teacherId === teacherId) {
                const error = new Error(`المعلم لديه حصة أخرى في نفس الوقت (${schedule.startTime} - ${schedule.endTime}) في صف ${schedule.classId === classId ? "هذا" : "آخر"}.`);
                error.statusCode = 409;
                throw error;
            }
            if (schedule.classId === classId) {
                const error = new Error(`هذا الصف لديه حصة مادة أخرى في هذا الوقت (${schedule.startTime} - ${schedule.endTime}).`);
                error.statusCode = 409;
                throw error;
            }
        }
    }

    // 4. Create schedule
    const newSchedule = await prisma.schedule.create({
        data: {
            day,
            startTime,
            endTime,
            schoolId,
            classId,
            subjectId,
            teacherId
        },
        include: {
            class: { select: { name: true } },
            subject: { select: { name: true } },
            teacher: { select: { firstName: true, lastName: true } }
        }
    });

    // 5. Invalidate Cache
    await redis.del(`school:${schoolId}:schedules`);
    await redis.del(`school:${schoolId}:class:${classId}:schedules`);

    return newSchedule;
};

/**
 * @description Create multiple schedule entries (Bulk)
 */
exports.bulkCreateScheduleService = async (schoolId, items) => {
    if (!Array.isArray(items) || items.length === 0) {
        const error = new Error("قائمة الجداول فارغة.");
        error.statusCode = 400;
        throw error;
    }

    // Prepare for batch operations or sequential with careful validation
    const createdSchedules = [];

    // Use a transaction to ensure all or nothing
    return await prisma.$transaction(async (tx) => {
        for (const item of items) {
            const { day, startTime, endTime, classId, subjectId, teacherId } = item;

            // 1. Basic Validation
            if (startTime >= endTime) {
                throw new Error(`خطأ في الحصة (${startTime}-${endTime}): وقت البداية يجب أن يكون قبل وقت النهاية.`);
            }

            // 2. Conflict Check against DB AND currently added items in this batch
            const overlapping = await tx.schedule.findFirst({
                where: {
                    schoolId,
                    day,
                    OR: [
                        { classId },
                        { teacherId }
                    ],
                    AND: [
                        { startTime: { lt: endTime } },
                        { endTime: { gt: startTime } }
                    ]
                }
            });

            if (overlapping) {
                const type = overlapping.classId === classId ? "الصف" : "المعلم";
                throw new Error(`تداخل في الوقت: ${type} لديه حصة أخرى بين ${overlapping.startTime} و ${overlapping.endTime} يوم ${day}.`);
            }

            // 3. Create
            const sch = await tx.schedule.create({
                data: { day, startTime, endTime, schoolId, classId, subjectId, teacherId },
                include: {
                    subject: { select: { name: true } },
                    teacher: { select: { firstName: true, lastName: true } }
                }
            });
            createdSchedules.push(sch);
        }

        // Invalidate Cache
        await redis.del(`school:${schoolId}:schedules`);
        const distinctClasses = [...new Set(items.map(i => i.classId))];
        for (const cid of distinctClasses) {
            await redis.del(`school:${schoolId}:class:${cid}:schedules`);
        }

        return createdSchedules;
    });
};

/**
 * @description Get all schedules for a school
 */
exports.getAllSchedulesService = async (schoolId) => {
    const cacheKey = `school:${schoolId}:schedules`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const schedules = await prisma.schedule.findMany({
        where: { schoolId },
        include: {
            class: { select: { name: true } },
            subject: { select: { name: true } },
            teacher: { select: { firstName: true, lastName: true } }
        },
        orderBy: [
            { day: 'asc' },
            { startTime: 'asc' }
        ]
    });

    await redis.set(cacheKey, JSON.stringify(schedules), 'EX', 3600);
    return schedules;
};

/**
 * @description Get schedules for a specific class
 */
exports.getSchedulesByClassService = async (schoolId, classId) => {
    const cacheKey = `school:${schoolId}:class:${classId}:schedules`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const schedules = await prisma.schedule.findMany({
        where: { schoolId, classId },
        include: {
            subject: { select: { name: true } },
            teacher: { select: { firstName: true, lastName: true } }
        },
        orderBy: [
            { day: 'asc' },
            { startTime: 'asc' }
        ]
    });

    await redis.set(cacheKey, JSON.stringify(schedules), 'EX', 3600);
    return schedules;
};

/**
 * @description Delete a schedule entry
 */
exports.deleteScheduleService = async (schoolId, id) => {
    const schedule = await prisma.schedule.findFirst({
        where: { id, schoolId }
    });

    if (!schedule) {
        const error = new Error("الحصة غير موجودة.");
        error.statusCode = 404;
        throw error;
    }

    await prisma.schedule.delete({ where: { id } });

    // Invalidate Cache
    await redis.del(`school:${schoolId}:schedules`);
    await redis.del(`school:${schoolId}:class:${schedule.classId}:schedules`);

    return { message: "تم حذف الحصة بنجاح." };
};

/**
 * @description Update a single schedule entry
 */
exports.updateScheduleService = async (schoolId, id, reqData) => {
    const { day, startTime, endTime, classId, subjectId, teacherId } = reqData;

    // 1. Check if exists
    const schedule = await prisma.schedule.findFirst({ where: { id, schoolId } });
    if (!schedule) {
        const error = new Error("الحصة غير موجودة.");
        error.statusCode = 404;
        throw error;
    }

    // 2. Conflict Check (Teacher & Class) - Excluding current ID
    const conflict = await prisma.schedule.findFirst({
        where: {
            schoolId,
            day,
            id: { not: id }, // EXCLUDE SELF
            OR: [
                { classId: classId || schedule.classId },
                { teacherId: teacherId || schedule.teacherId }
            ],
            AND: [
                { startTime: { lt: endTime || schedule.endTime } },
                { endTime: { gt: startTime || schedule.startTime } }
            ]
        }
    });

    if (conflict) {
        const type = conflict.classId === (classId || schedule.classId) ? "الصف" : "المعلم";
        throw new Error(`تداخل في الوقت: ${type} لديه حصة أخرى بين ${conflict.startTime} و ${conflict.endTime} يوم ${day}.`);
    }

    // 3. Update
    const updated = await prisma.schedule.update({
        where: { id },
        data: { day, startTime, endTime, subjectId, teacherId, classId },
        include: {
            subject: { select: { name: true } },
            teacher: { select: { firstName: true, lastName: true } }
        }
    });

    // 4. Invalidate Cache
    await redis.del(`school:${schoolId}:schedules`);
    await redis.del(`school:${schoolId}:class:${updated.classId}:schedules`);
    if (schedule.classId !== updated.classId) {
        await redis.del(`school:${schoolId}:class:${schedule.classId}:schedules`);
    }

    return updated;
};

/**
 * @description Sync multiple schedules for a class and day (Delete existing, Add new)
 */
exports.bulkSyncScheduleService = async (schoolId, classId, day, items) => {
    return await prisma.$transaction(async (tx) => {
        // 1. Delete all existing schedules for this specific day/class
        await tx.schedule.deleteMany({
            where: { schoolId, classId, day }
        });

        const createdSchedules = [];

        // 2. Insert new ones with validation
        for (const item of items) {
            const { startTime, endTime, subjectId, teacherId } = item;

            if (startTime >= endTime) {
                throw new Error(`خطأ في الحصة (${startTime}-${endTime}): وقت البداية يجب أن يكون قبل وقت النهاية.`);
            }

            // Check for teacher overlap ONLY (class overlap is handled by deleting all existing for this class)
            const teacherConflict = await tx.schedule.findFirst({
                where: {
                    schoolId,
                    day,
                    teacherId,
                    AND: [
                        { startTime: { lt: endTime } },
                        { endTime: { gt: startTime } }
                    ]
                }
            });

            if (teacherConflict) {
                throw new Error(`المعلم لديه حصة أخرى في نفس الوقت (${startTime} - ${endTime}) يوم ${day}.`);
            }

            const sch = await tx.schedule.create({
                data: {
                    day,
                    startTime,
                    endTime,
                    schoolId,
                    classId,
                    subjectId,
                    teacherId
                }
            });
            createdSchedules.push(sch);
        }

        // 3. Clear Cache
        await redis.del(`school:${schoolId}:schedules`);
        await redis.del(`school:${schoolId}:class:${classId}:schedules`);

        return createdSchedules;
    });
};
