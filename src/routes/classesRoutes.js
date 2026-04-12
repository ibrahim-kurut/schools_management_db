const express = require("express");
const router = express.Router();
const { createClassController, getAllClassesController, getClassStudentsController, getClassByIdController, updateClassController, deleteClassController } = require("../controllers/classesController");
const { verifyToken, authorize } = require("../middleware/verifyToken");

router.post("/", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT", "SUPER_ADMIN"]), createClassController);
router.get("/", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT", "SUPER_ADMIN"]), getAllClassesController);
router.get("/:classId/students", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT", "SUPER_ADMIN"]), getClassStudentsController);
router.get("/:classId", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT", "SUPER_ADMIN"]), getClassByIdController);
router.put("/:classId", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT", "SUPER_ADMIN"]), updateClassController);
router.delete("/:classId", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT", "SUPER_ADMIN"]), deleteClassController);



module.exports = router;
