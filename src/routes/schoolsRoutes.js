const express = require("express");
const { createSchool } = require("../controllers/schoolsController");
const { verifyToken, authorize } = require("../middleware/verifyToken");
const router = express.Router();

// Routes 
router.post("/", verifyToken, authorize(["SCHOOL_ADMIN"]), createSchool);

module.exports = router;