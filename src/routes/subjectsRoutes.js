const express = require("express");
const { createSubjectController } = require("../controllers/subjectsController");
const { verifyToken, authorize } = require("../middleware/verifyToken");
const router = express.Router();

router.post("/", verifyToken, authorize(["SCHOOL_ADMIN", "ASISTANT"]), createSubjectController);

module.exports = router;