const express = require("express");
const router = express.Router();

const {
    getFinanceStatsController,
    getMonthlyFinanceReportController,
    exportMonthlyFinanceReportController
} = require("../controllers/financeController");
const { verifyToken, authorize } = require("../middleware/verifyToken");
const requireFeature = require("../middleware/checkFeature.middleware");

router.get(
    "/stats/:schoolId",
    verifyToken,
    authorize(["ACCOUNTANT", "SCHOOL_ADMIN", "SUPER_ADMIN"]),
    requireFeature("hasFinancials"),
    getFinanceStatsController
);

router.get(
    "/report/monthly/:schoolId",
    verifyToken,
    authorize(["ACCOUNTANT", "SCHOOL_ADMIN", "SUPER_ADMIN"]),
    requireFeature("hasFinancials"),
    getMonthlyFinanceReportController
);

router.get(
    "/export/monthly/:schoolId",
    verifyToken,
    authorize(["ACCOUNTANT", "SCHOOL_ADMIN", "SUPER_ADMIN"]),
    requireFeature("hasFinancials"),
    exportMonthlyFinanceReportController
);

module.exports = router;
