const express = require("express");
const { createSubjectController, getAllSubjectsController } = require("../controllers/subjectsController");
const { verifyToken, authorize } = require("../middleware/verifyToken");
const router = express.Router();

router.post("/", verifyToken, authorize(["SCHOOL_ADMIN", "ASISTANT"]), createSubjectController);
router.get("/", verifyToken, authorize(["SCHOOL_ADMIN", "ASISTANT"]), getAllSubjectsController);

module.exports = router;