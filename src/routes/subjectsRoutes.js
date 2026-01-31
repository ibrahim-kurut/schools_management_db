const express = require("express");
const { createSubjectController, getAllSubjectsController, getSubjectByIdController, updateSubjectController, deleteSubjectController } = require("../controllers/subjectsController");
const { verifyToken, authorize } = require("../middleware/verifyToken");
const router = express.Router();

router.post("/", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT"]), createSubjectController);
router.get("/", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT"]), getAllSubjectsController);
router.get("/:id", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT"]), getSubjectByIdController);
router.put("/:id", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT"]), updateSubjectController);
router.delete("/:id", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT"]), deleteSubjectController);

module.exports = router;