const archiveService = require("../services/archiveService");

/**
 * @description Get all archived items
 * @route GET /api/archive
 * @access private (school owner, assistant)
 */
exports.getArchivedData = async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const result = await archiveService.getArchivedDataService(schoolId);
        
        if (result.status === "SUCCESS") {
            return res.status(200).json(result);
        }
        return res.status(400).json(result);
    } catch (error) {
        console.error("Archive Get Error:", error);
        return res.status(500).json({ error: error.message });
    }
};

/**
 * @description Restore an archived item
 * @route POST /api/archive/restore
 * @access private (school owner, assistant)
 */
exports.restoreData = async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { type, id } = req.body;

        if (!type || !id) {
            return res.status(400).json({ status: "ERROR", message: "نوع البيانات والمعرف مطلوبان." });
        }

        const result = await archiveService.restoreDataService(schoolId, type, id);
        
        if (result.status === "SUCCESS") {
            return res.status(200).json(result);
        }
        return res.status(400).json(result);
    } catch (error) {
        console.error("Archive Restore Error:", error);
        return res.status(500).json({ error: error.message });
    }
};

/**
 * @description Permanently delete an item
 * @route DELETE /api/archive/permanent/:type/:id
 * @access private (school owner)
 */
exports.permanentDelete = async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { type, id } = req.params;

        if (!type || !id) {
            return res.status(400).json({ status: "ERROR", message: "نوع البيانات والمعرف مطلوبان." });
        }

        const result = await archiveService.permanentDeleteService(schoolId, type, id);
        
        if (result.status === "SUCCESS") {
            return res.status(200).json(result);
        }
        return res.status(400).json(result);
    } catch (error) {
        console.error("Archive Permanent Delete Error:", error);
        return res.status(500).json({ error: error.message });
    }
};
