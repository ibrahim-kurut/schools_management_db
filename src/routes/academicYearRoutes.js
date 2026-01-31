const express = require("express");
const router = express.Router();
const { createAcademicYearController } = require("../controllers/academicYearController");
const { verifyToken, authorize } = require("../middleware/verifyToken");

router.post("/", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT"]), createAcademicYearController);

module.exports = router;