const { 
    createScheduleService, 
    getAllSchedulesService, 
    getSchedulesByClassService, 
    deleteScheduleService,
    bulkCreateScheduleService,
    updateScheduleService,
    bulkSyncScheduleService
} = require("../services/scheduleService");
const asyncHandler = require("../utils/asyncHandler");

/**
 * @description Create a new schedule entry
 * @route POST /api/schedules
 */
exports.createScheduleController = asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    const newSchedule = await createScheduleService(schoolId, req.body);
    res.status(201).json({
        success: true,
        message: "تم إنشاء الحصة بنجاح.",
        data: newSchedule
    });
});

/**
 * @description Create multiple schedule entries (Bulk)
 * @route POST /api/schedules/bulk
 */
exports.bulkCreateScheduleController = asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    const { items } = req.body;
    const newSchedules = await bulkCreateScheduleService(schoolId, items);
    res.status(201).json({
        success: true,
        message: `تم إنشاء ${newSchedules.length} حصة بنجاح.`,
        data: newSchedules
    });
});

/**
 * @description Sync schedules for a class and day (Bulk Update/Delete/Add)
 * @route POST /api/schedules/sync
 */
exports.bulkSyncScheduleController = asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    const { classId, day, items } = req.body;
    const syncedSchedules = await bulkSyncScheduleService(schoolId, classId, day, items);
    res.status(200).json({
        success: true,
        message: "تم تحديث جدول اليوم بنجاح.",
        data: syncedSchedules
    });
});

/**
 * @description Get all schedules for the school
 * @route GET /api/schedules
 */
exports.getAllSchedulesController = asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    const schedules = await getAllSchedulesService(schoolId);
    res.status(200).json({
        success: true,
        data: schedules
    });
});

/**
 * @description Get schedules for a specific class
 * @route GET /api/schedules/class/:classId
 */
exports.getSchedulesByClassController = asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    const { classId } = req.params;
    const schedules = await getSchedulesByClassService(schoolId, classId);
    res.status(200).json({
        success: true,
        data: schedules
    });
});

/**
 * @description Delete a schedule entry
 * @route DELETE /api/schedules/:id
 */
exports.deleteScheduleController = asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    const { id } = req.params;
    const result = await deleteScheduleService(schoolId, id);
    res.status(200).json({
        success: true,
        ...result
    });
});

/**
 * @description Update a schedule entry
 * @route PATCH /api/schedules/:id
 */
exports.updateScheduleController = asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    const { id } = req.params;
    const updated = await updateScheduleService(schoolId, id, req.body);
    res.status(200).json({
        success: true,
        message: "تم تحديث الحصة بنجاح.",
        data: updated
    });
});
