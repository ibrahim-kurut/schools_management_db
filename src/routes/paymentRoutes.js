const express = require("express");
const router = express.Router();

const { updateStudentDiscountController, createPaymentController } = require("../controllers/paymentController");
const { verifyToken, authorize } = require("../middleware/verifyToken");

router.put("/discount/:studentId", verifyToken, authorize(["SCHOOL_ADMIN", "ACCOUNTANT"]), updateStudentDiscountController);

router.post("/", verifyToken, authorize(["ACCOUNTANT"]), createPaymentController);

module.exports = router;
