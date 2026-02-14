const express = require("express");
const router = express.Router();

const { updateStudentDiscountController } = require("../controllers/paymentController");
const { verifyToken, authorize } = require("../middleware/verifyToken");

router.put("/discount/:studentId", verifyToken, authorize(["SCHOOL_ADMIN", "ACCOUNTANT"]), updateStudentDiscountController);


module.exports = router;
