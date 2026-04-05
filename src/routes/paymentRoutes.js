const express = require("express");
const router = express.Router();

const { updateStudentDiscountController, createPaymentController, getStudentFinancialRecordController, updatePaymentController, getStudentsFeesSummaryController } = require("../controllers/paymentController");
const { verifyToken, authorize } = require("../middleware/verifyToken");

router.put("/discount/:studentId", verifyToken, authorize(["SCHOOL_ADMIN", "ACCOUNTANT"]), updateStudentDiscountController);

router.post("/", verifyToken, authorize(["ACCOUNTANT"]), createPaymentController);

router.get("/financial-record/:studentId", verifyToken, authorize(["SCHOOL_ADMIN", "ACCOUNTANT", "STUDENT", "PARENT"]), getStudentFinancialRecordController);

router.put("/:id", verifyToken, authorize(["SCHOOL_ADMIN", "ACCOUNTANT"]), updatePaymentController);

router.get("/students-summary", verifyToken, authorize(["SCHOOL_ADMIN", "ACCOUNTANT"]), getStudentsFeesSummaryController);


module.exports = router;
