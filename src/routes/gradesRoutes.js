const express = require("express");
const router = express.Router();

const { createGradeController, getGradesByStudentIdController } = require("../controllers/gradesController");
const { verifyToken, authorize } = require("../middleware/verifyToken");

router.post("/", verifyToken, authorize(["SCHOOL_ADMIN", "TEACHER"]), createGradeController);
router.get("/student/:studentId", verifyToken, authorize(["SCHOOL_ADMIN", "TEACHER", "ASSISTANT"]), getGradesByStudentIdController);

module.exports = router;