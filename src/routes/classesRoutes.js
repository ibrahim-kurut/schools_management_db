const express = require("express");
const router = express.Router();
const { createClassController, getAllClassesController, getClassStudentsController, getClassByIdController } = require("../controllers/classesController");
const { verifyToken, authorize } = require("../middleware/verifyToken");

router.post("/", verifyToken, authorize(["SCHOOL_ADMIN"]), createClassController);
router.get("/", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT"]), getAllClassesController);
router.get("/:classId/students", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT"]), getClassStudentsController);
router.get("/:classId", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT"]), getClassByIdController);



module.exports = router;
