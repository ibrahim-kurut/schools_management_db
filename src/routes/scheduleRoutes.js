const express = require("express");
const { 
    createScheduleController, 
    getAllSchedulesController, 
    getSchedulesByClassController, 
    deleteScheduleController,
    bulkCreateScheduleController,
    updateScheduleController,
    bulkSyncScheduleController
} = require("../controllers/scheduleController");
const { verifyToken, authorize } = require("../middleware/verifyToken");
const requireFeature = require("../middleware/checkFeature.middleware");

const router = express.Router();

// Management routes (Create/Delete) - Admin & Assistant Only
router.post("/bulk", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT"]), requireFeature('hasSchedules'), bulkCreateScheduleController);
router.post("/sync", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT"]), requireFeature('hasSchedules'), bulkSyncScheduleController);
router.post("/", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT"]), requireFeature('hasSchedules'), createScheduleController);
router.patch("/:id", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT"]), requireFeature('hasSchedules'), updateScheduleController);
router.delete("/:id", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT"]), requireFeature('hasSchedules'), deleteScheduleController);

// View routes - All Authenticated Roles
router.get("/", verifyToken, requireFeature('hasSchedules'), getAllSchedulesController);
router.get("/class/:classId", verifyToken, requireFeature('hasSchedules'), getSchedulesByClassController);

module.exports = router;
