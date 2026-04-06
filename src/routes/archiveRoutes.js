const express = require("express");
const router = express.Router();
const { verifyToken, authorize } = require("../middleware/verifyToken");
const archiveController = require("../controllers/archiveController");

// All archive routes require authentication
router.use(verifyToken);

// Get archived data (Owner and Assistant)
router.get("/", authorize(["SCHOOL_ADMIN", "ASSISTANT"]), archiveController.getArchivedData);

// Restore data (Owner and Assistant)
router.post("/restore", authorize(["SCHOOL_ADMIN", "ASSISTANT"]), archiveController.restoreData);

// Permanent delete (Only Owner)
router.delete("/permanent/:type/:id", authorize(["SCHOOL_ADMIN"]), archiveController.permanentDelete);

module.exports = router;
