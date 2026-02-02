const { createAcademicYearService, getAcademicYearsService, getAcademicYearByIdService, updateAcademicYearService, deleteAcademicYearService } = require("../services/academicYearService");
const { createAcademicYearSchema, updateAcademicYearSchema } = require("../utils/academicYearValidate");


/**
 * @description create a new academic year
 * @route POST /api/academic-years
 * @method POST
 * @access private (school owner, assistant)
 */

exports.createAcademicYearController = async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        // 1. validate the request data
        const { error, value } = createAcademicYearSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }
        const academicYearData = value;

        // 2. call the service and pass the request data
        const addAcademicYear = await createAcademicYearService(schoolId, academicYearData);
        if (addAcademicYear.status === "NOT_FOUND") {
            return res.status(404).json({ message: addAcademicYear.message });
        }
        if (addAcademicYear.status === "CONFLICT") {
            return res.status(400).json({ message: addAcademicYear.message });
        }
        return res.status(201).json({ message: addAcademicYear.message, academicYear: addAcademicYear.academicYear });
    } catch (error) {
        console.log("Error in createAcademicYearController:", error);
        res.status(500).json({ message: error.message });
    }
}

/**
 * @description get all academic years
 * @route GET /api/academic-year
 * @method GET
 * @access private (school owner, assistant)
 */
exports.getAcademicYearsController = async (req, res) => {
    try {
        const schoolId = req.user.schoolId;


        const academicYears = await getAcademicYearsService(schoolId);
        if (academicYears.status === "NOT_FOUND") {
            return res.status(404).json({ message: academicYears.message });
        }
        if (academicYears.status === "CONFLICT") {
            return res.status(400).json({ message: academicYears.message });
        }
        return res.status(200).json({ message: "Academic years retrieved successfully", academicYears });
    } catch (error) {
        console.log("Error in getAllAcademicYearsController:", error);
        res.status(500).json({ message: error.message });
    }
}

/**
 * @description get academic year by id
 * @route GET /api/academic-year/:id
 * @method GET
 * @access private (school owner, assistant)
 */
exports.getAcademicYearByIdController = async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const academicYearId = req.params.id;

        const academicYear = await getAcademicYearByIdService(schoolId, academicYearId);
        if (academicYear.status === "NOT_FOUND") {
            return res.status(404).json({ message: academicYear.message });
        }
        if (academicYear.status === "CONFLICT") {
            return res.status(400).json({ message: academicYear.message });
        }
        return res.status(200).json({ message: "Academic year retrieved successfully", academicYear });
    } catch (error) {
        console.log("Error in getAcademicYearByIdController:", error);
        res.status(500).json({ message: error.message });
    }
}

/**
 * @description update academic year
 * @route PUT /api/academic-year/:id
 * @method PUT
 * @access private (school owner, assistant)
 */
exports.updateAcademicYearController = async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const academicYearId = req.params.id;

        // 1. validate the request data
        const { error, value } = updateAcademicYearSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }
        const academicYearData = value;
        // 2. call the service and pass the request data
        const academicYear = await updateAcademicYearService(schoolId, academicYearId, academicYearData);
        if (academicYear.status === "NOT_FOUND") {
            return res.status(404).json({ message: academicYear.message });
        }
        if (academicYear.status === "CONFLICT") {
            return res.status(400).json({ message: academicYear.message });
        }
        return res.status(200).json({ message: "Academic year updated successfully", academicYear });
    } catch (error) {
        console.log("Error in updateAcademicYearController:", error);
        res.status(500).json({ message: error.message });
    }
}

/**
 * @description delete academic year
 * @route DELETE /api/academic-year/:id
 * @method DELETE
 * @access private (school owner, assistant)
 */
exports.deleteAcademicYearController = async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const academicYearId = req.params.id;

        const academicYear = await deleteAcademicYearService(schoolId, academicYearId);
        if (academicYear.status === "NOT_FOUND") {
            return res.status(404).json({ message: academicYear.message });
        }
        return res.status(200).json({ message: "Academic year deleted successfully", academicYear });
    } catch (error) {
        console.log("Error in deleteAcademicYearController:", error);
        res.status(500).json({ message: error.message });
    }
}
