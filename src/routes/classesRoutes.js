const express = require("express");
const router = express.Router();
const { createClassController } = require("../controllers/classesController");
const { verifyToken, authorize } = require("../middleware/verifyToken");

router.post("/", verifyToken, authorize(["SCHOOL_ADMIN"]), createClassController);



module.exports = router;
