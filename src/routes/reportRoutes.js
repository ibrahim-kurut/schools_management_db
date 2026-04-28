const express = require("express");
const {
    createPlatformReportController,
    getAllPlatformReportsController,
    getPlatformReportByIdController,
    deletePlatformReportController,
} = require("../controllers/reportController");
const { verifyToken, authorize } = require("../middleware/verifyToken");
const router = express.Router();

// Super Admin: Create a new platform report snapshot
router.post("/platform", verifyToken, authorize("SUPER_ADMIN"), createPlatformReportController);

// Super Admin: Get all archived reports
router.get("/platform", verifyToken, authorize("SUPER_ADMIN"), getAllPlatformReportsController);

// Super Admin: Get a single report by ID
router.get("/platform/:id", verifyToken, authorize("SUPER_ADMIN"), getPlatformReportByIdController);

// Super Admin: Delete a report
router.delete("/platform/:id", verifyToken, authorize("SUPER_ADMIN"), deletePlatformReportController);

module.exports = router;
