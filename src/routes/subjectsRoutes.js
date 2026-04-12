const express = require("express");
const { createSubjectController, getAllSubjectsController, getSubjectByIdController, updateSubjectController, deleteSubjectController } = require("../controllers/subjectsController");
const { verifyToken, authorize } = require("../middleware/verifyToken");
const router = express.Router();

router.post("/", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT", "SUPER_ADMIN"]), createSubjectController);
router.get("/", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT", "SUPER_ADMIN"]), getAllSubjectsController);
router.get("/:id", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT", "SUPER_ADMIN"]), getSubjectByIdController);
router.put("/:id", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT", "SUPER_ADMIN"]), updateSubjectController);
router.delete("/:id", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT", "SUPER_ADMIN"]), deleteSubjectController);

module.exports = router;