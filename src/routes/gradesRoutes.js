const express = require("express");
const router = express.Router();

const { createGradeController } = require("../controllers/gradesController");
const { verifyToken, authorize } = require("../middleware/verifyToken");

router.post("/", verifyToken, authorize(["SCHOOL_ADMIN", "TEACHER"]), createGradeController);

module.exports = router;