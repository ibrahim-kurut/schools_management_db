const express = require("express");
const { createSchool, getAllSchools, getSchoolById, updateSchoolById, deleteSchoolById } = require("../controllers/schoolsController");
const { uploadSchoolLogo } = require("../controllers/uploadController");
const { verifyToken, authorize } = require("../middleware/verifyToken");
const upload = require("../middleware/upload");
const router = express.Router();

// Routes
router.post("/", verifyToken, authorize(["SCHOOL_ADMIN"]), upload.single("logo"), createSchool);
router.get("/", verifyToken, authorize(["SUPER_ADMIN"]), getAllSchools);
router.get("/:id", verifyToken, authorize(["SCHOOL_ADMIN", "SUPER_ADMIN"]), getSchoolById);
router.put("/:id", verifyToken, authorize(["SCHOOL_ADMIN", "SUPER_ADMIN"]), updateSchoolById);
router.delete("/:id", verifyToken, authorize(["SCHOOL_ADMIN", "SUPER_ADMIN"]), deleteSchoolById);

// Upload school logo (ONLY school owner)
// Field name in the multipart form must be "logo"
router.post("/:id/upload-logo", verifyToken, authorize(["SCHOOL_ADMIN"]), upload.single("logo"), uploadSchoolLogo);

module.exports = router;