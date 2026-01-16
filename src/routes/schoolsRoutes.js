const express = require("express");
const { createSchool, getAllSchools, getSchoolById, updateSchoolById } = require("../controllers/schoolsController");
const { verifyToken, authorize } = require("../middleware/verifyToken");
const router = express.Router();

// Routes 
router.post("/", verifyToken, authorize(["SCHOOL_ADMIN"]), createSchool);
router.get("/", verifyToken, authorize(["SUPER_ADMIN"]), getAllSchools);
router.get("/:id", verifyToken, authorize(["SCHOOL_ADMIN", "SUPER_ADMIN"]), getSchoolById);
router.put("/:id", verifyToken, authorize(["SCHOOL_ADMIN", "SUPER_ADMIN"]), updateSchoolById);

module.exports = router;