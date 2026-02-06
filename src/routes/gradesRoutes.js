const express = require("express");
const router = express.Router();

const { createGradeController, getGradesByStudentIdController, getStudentGradesController } = require("../controllers/gradesController");
const { verifyToken, authorize } = require("../middleware/verifyToken");

router.post("/", verifyToken, authorize(["SCHOOL_ADMIN", "TEACHER"]), createGradeController);
router.get("/student/:studentId", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT"]), getGradesByStudentIdController);
router.get("/student/:studentId/current", verifyToken, authorize("STUDENT"), getStudentGradesController); // For students to view their grades for the current academic year

module.exports = router;