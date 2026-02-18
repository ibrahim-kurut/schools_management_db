const express = require("express");
const router = express.Router();

const { updateStudentDiscountController, createPaymentController, getStudentFinancialRecordController, updatePaymentController } = require("../controllers/paymentController");
const { verifyToken, authorize } = require("../middleware/verifyToken");

router.put("/discount/:studentId", verifyToken, authorize(["SCHOOL_ADMIN", "ACCOUNTANT"]), updateStudentDiscountController);

router.post("/", verifyToken, authorize(["ACCOUNTANT"]), createPaymentController);

router.get("/financial-record/:studentId", verifyToken, authorize(["SCHOOL_ADMIN", "ACCOUNTANT", "STUDENT", "PARENT"]), getStudentFinancialRecordController);

router.put("/:id", verifyToken, authorize(["SCHOOL_ADMIN", "ACCOUNTANT"]), updatePaymentController);

module.exports = router;
