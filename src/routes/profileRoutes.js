const express = require("express");
const router = express.Router();
const { getUserProfileController, getTeacherStudentsController } = require("../controllers/profileController");
const { verifyToken, authorize } = require("../middleware/verifyToken");

router.get("/", verifyToken, getUserProfileController);
router.get("/teacher/students", verifyToken, authorize("TEACHER"), getTeacherStudentsController);

module.exports = router;