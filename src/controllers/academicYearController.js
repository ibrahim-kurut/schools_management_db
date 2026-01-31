const { createAcademicYearService } = require("../services/academicYearService");
const { createAcademicYearSchema } = require("../utils/academicYearValidate");


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