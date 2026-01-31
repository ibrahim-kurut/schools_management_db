const express = require("express");
const router = express.Router();
const { createAcademicYearController, getAcademicYearsController } = require("../controllers/academicYearController");
const { verifyToken, authorize } = require("../middleware/verifyToken");

router.post("/", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT"]), createAcademicYearController);
router.get("/", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT"]), getAcademicYearsController);
module.exports = router;