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
const router = express.Router();

// Management routes (Create/Delete) - Admin & Assistant Only
router.post("/bulk", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT"]), bulkCreateScheduleController);
router.post("/sync", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT"]), bulkSyncScheduleController);
router.post("/", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT"]), createScheduleController);
router.patch("/:id", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT"]), updateScheduleController);
router.delete("/:id", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT"]), deleteScheduleController);

// View routes - All Authenticated Roles
router.get("/", verifyToken, getAllSchedulesController);
router.get("/class/:classId", verifyToken, getSchedulesByClassController);

module.exports = router;
