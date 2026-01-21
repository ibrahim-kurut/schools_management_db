const express = require("express");
const router = express.Router();
const { createClassController, getAllClassesController, getClassStudentsController } = require("../controllers/classesController");
const { verifyToken, authorize } = require("../middleware/verifyToken");

router.post("/", verifyToken, authorize(["SCHOOL_ADMIN"]), createClassController);
router.get("/", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT"]), getAllClassesController);
router.get("/:classId/students", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT"]), getClassStudentsController);



module.exports = router;
