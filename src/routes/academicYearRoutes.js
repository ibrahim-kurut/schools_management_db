const express = require("express");
const router = express.Router();
const { createAcademicYearController, getAcademicYearsController, getAcademicYearByIdController, updateAcademicYearController, deleteAcademicYearController } = require("../controllers/academicYearController");
const { verifyToken, authorize } = require("../middleware/verifyToken");

router.post("/", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT"]), createAcademicYearController);
router.get("/", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT"]), getAcademicYearsController);
router.get("/:id", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT"]), getAcademicYearByIdController)
router.put("/:id", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT"]), updateAcademicYearController);
router.delete("/:id", verifyToken, authorize(["SCHOOL_ADMIN", "ASSISTANT"]), deleteAcademicYearController);
module.exports = router;