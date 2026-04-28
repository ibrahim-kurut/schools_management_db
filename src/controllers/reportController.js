const asyncHandler = require("../utils/asyncHandler");
const {
    createPlatformReportService,
    getAllPlatformReportsService,
    getPlatformReportByIdService,
    deletePlatformReportService,
} = require("../services/reportService");

/**
 * @description Create a new platform report snapshot
 * @route POST /api/reports/platform
 * @access private (Super Admin only)
 */
exports.createPlatformReportController = asyncHandler(async (req, res) => {
    const { title, year, month, type } = req.body;

    if (!title || !year || !type) {
        return res.status(400).json({
            success: false,
            message: "عنوان التقرير والسنة ونوع التقرير مطلوبة",
        });
    }

    const report = await createPlatformReportService({ title, year, month, type });

    res.status(201).json({
        success: true,
        message: "تم إنشاء التقرير وأرشفته بنجاح",
        data: report,
    });
});

/**
 * @description Get all archived platform reports
 * @route GET /api/reports/platform
 * @access private (Super Admin only)
 */
exports.getAllPlatformReportsController = asyncHandler(async (req, res) => {
    const reports = await getAllPlatformReportsService();

    res.status(200).json({
        success: true,
        data: reports,
        count: reports.length,
    });
});

/**
 * @description Get a single platform report by ID
 * @route GET /api/reports/platform/:id
 * @access private (Super Admin only)
 */
exports.getPlatformReportByIdController = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const report = await getPlatformReportByIdService(id);

    if (!report) {
        return res.status(404).json({
            success: false,
            message: "التقرير غير موجود",
        });
    }

    res.status(200).json({
        success: true,
        data: report,
    });
});

/**
 * @description Delete a platform report
 * @route DELETE /api/reports/platform/:id
 * @access private (Super Admin only)
 */
exports.deletePlatformReportController = asyncHandler(async (req, res) => {
    const { id } = req.params;

    await deletePlatformReportService(id);

    res.status(200).json({
        success: true,
        message: "تم حذف التقرير بنجاح",
    });
});
