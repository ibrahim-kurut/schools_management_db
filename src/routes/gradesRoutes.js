const express = require("express");
const router = express.Router();

const { createGradeController, getGradesByStudentIdController, getStudentGradesController, getSubjectTeacherStudentGradesController, updateGradeController, deleteGradeController, getTeacherClassGradesController, getClassStudentResultsController } = require("../controllers/gradesController");
const { verifyToken, authorize } = require("../middleware/verifyToken");

router.post("/", verifyToken, authorize(["SCHOOL_ADMIN", "TEACHER"]), createGradeController);
router.get("/student/:studentId", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT"]), getGradesByStudentIdController);
router.get("/student/:studentId/current", verifyToken, authorize("STUDENT"), getStudentGradesController); // For students to view their grades for the current academic year
router.get("/subject-teacher/:studentId", verifyToken, authorize("TEACHER"), getSubjectTeacherStudentGradesController); // For subject teachers to view grades of a specific student
router.get("/teacher-class/:classId", verifyToken, authorize("TEACHER"), getTeacherClassGradesController); // For teachers to view all student grades in a class
router.get("/class/:classId/results", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT"]), getClassStudentResultsController); // For admin/assistant to view & print student results
router.put("/:studentId", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT", "TEACHER"]), updateGradeController); // For updating a grade (can be done by school admin, assistant, or teacher)
router.delete("/:gradeId", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT", "TEACHER"]), deleteGradeController); // For deleting a grade

module.exports = router;