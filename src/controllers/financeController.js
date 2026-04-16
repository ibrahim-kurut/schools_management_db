const asyncHandler = require("../utils/asyncHandler");
const {
    getFinanceStatsService,
    getMonthlyFinanceReportService,
    exportMonthlyFinanceReportService
} = require("../services/financeService");

/**
 * @description Get finance dashboard stats for a school
 * @route GET /api/finance/stats/:schoolId
 * @method GET
 * @access private (Accountant, School Admin, Super Admin)
 */
exports.getFinanceStatsController = asyncHandler(async (req, res) => {
    const { schoolId } = req.params;
    const result = await getFinanceStatsService(req.user, schoolId);

    return res.status(200).json({
        status: "SUCCESS",
        message: result.noFinancialData
            ? "No financial records found for this school yet"
            : "Finance statistics retrieved successfully",
        data: {
            school: result.school,
            totalRevenue: result.totalRevenue,
            totalExpenses: result.totalExpenses,
            netBalance: result.netBalance,
            pendingPayments: result.pendingPayments
        }
    });
});

/**
 * @description Get monthly finance report in JSON
 * @route GET /api/finance/report/monthly/:schoolId
 * @method GET
 * @access private (Accountant, School Admin, Super Admin)
 */
exports.getMonthlyFinanceReportController = asyncHandler(async (req, res) => {
    const { schoolId } = req.params;
    const { month } = req.query;

    const report = await getMonthlyFinanceReportService(req.user, schoolId, month);

    return res.status(200).json({
        status: "SUCCESS",
        message: "Monthly finance report retrieved successfully",
        data: report
    });
});

/**
 * @description Export monthly finance report as XLSX
 * @route GET /api/finance/export/monthly/:schoolId
 * @method GET
 * @access private (Accountant, School Admin, Super Admin)
 */
exports.exportMonthlyFinanceReportController = asyncHandler(async (req, res) => {
    const { schoolId } = req.params;
    const { month } = req.query;

    const { filename, buffer } = await exportMonthlyFinanceReportService(req.user, schoolId, month);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(buffer);
});
