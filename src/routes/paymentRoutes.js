const express = require("express");
const router = express.Router();

const { updateStudentDiscountController, createPaymentController, getStudentFinancialRecordController, updatePaymentController, getStudentsFeesSummaryController } = require("../controllers/paymentController");
const { verifyToken, authorize } = require("../middleware/verifyToken");
const requireFeature = require("../middleware/checkFeature.middleware");

router.put("/discount/:studentId", verifyToken, authorize(["SCHOOL_ADMIN", "ACCOUNTANT"]), requireFeature('hasFinancials'), updateStudentDiscountController);

router.post("/", verifyToken, authorize(["SCHOOL_ADMIN", "ACCOUNTANT"]), requireFeature('hasFinancials'), createPaymentController);

router.get("/financial-record/:studentId", verifyToken, authorize(["SCHOOL_ADMIN", "ACCOUNTANT", "STUDENT", "PARENT"]), requireFeature('hasFinancials'), getStudentFinancialRecordController);

router.put("/:id", verifyToken, authorize(["SCHOOL_ADMIN", "ACCOUNTANT"]), requireFeature('hasFinancials'), updatePaymentController);

router.get("/students-summary", verifyToken, authorize(["SCHOOL_ADMIN", "ACCOUNTANT"]), requireFeature('hasFinancials'), getStudentsFeesSummaryController);


module.exports = router;
