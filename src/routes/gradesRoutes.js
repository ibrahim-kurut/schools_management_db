const express = require("express");
const router = express.Router();

const { createGradeController, getGradesByStudentIdController, getStudentGradesController, getSubjectTeacherStudentGradesController } = require("../controllers/gradesController");
const { verifyToken, authorize } = require("../middleware/verifyToken");

router.post("/", verifyToken, authorize(["SCHOOL_ADMIN", "TEACHER"]), createGradeController);
router.get("/student/:studentId", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT"]), getGradesByStudentIdController);
router.get("/student/:studentId/current", verifyToken, authorize("STUDENT"), getStudentGradesController); // For students to view their grades for the current academic year
router.get("/subject-teacher/:studentId", verifyToken, authorize("TEACHER"), getSubjectTeacherStudentGradesController); // For subject teachers to view grades of a specific student

module.exports = router;