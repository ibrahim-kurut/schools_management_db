const express = require("express");
const router = express.Router();
const { getUserProfileController, getTeacherStudentsController } = require("../controllers/profileController");
const { uploadImage } = require("../controllers/uploadController");
const { verifyToken, authorize } = require("../middleware/verifyToken");
const upload = require("../middleware/upload");

// Get user profile
router.get("/", verifyToken, getUserProfileController);

// Get teacher's classes and students
router.get("/teacher/students", verifyToken, authorize(["TEACHER"]), getTeacherStudentsController);

// Upload / update profile image
// Only school-related roles can upload images (Exclude SUPER_ADMIN)
router.post("/upload-image", verifyToken, authorize(["SCHOOL_ADMIN", "TEACHER", "ACCOUNTANT", "ASSISTANT", "STUDENT"]), upload.single("image"), uploadImage);

module.exports = router;