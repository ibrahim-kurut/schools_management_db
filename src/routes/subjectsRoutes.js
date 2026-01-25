const express = require("express");
const { createSubjectController, getAllSubjectsController, getSubjectByIdController, updateSubjectController } = require("../controllers/subjectsController");
const { verifyToken, authorize } = require("../middleware/verifyToken");
const router = express.Router();

router.post("/", verifyToken, authorize(["SCHOOL_ADMIN", "ASISTANT"]), createSubjectController);
router.get("/", verifyToken, authorize(["SCHOOL_ADMIN", "ASISTANT"]), getAllSubjectsController);
router.get("/:id", verifyToken, authorize(["SCHOOL_ADMIN", "ASISTANT"]), getSubjectByIdController);
router.put("/:id", verifyToken, authorize(["SCHOOL_ADMIN", "ASISTANT"]), updateSubjectController);

module.exports = router;