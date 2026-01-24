const { createSubjectService, getAllSubjectsService, getSubjectByIdService, getSubjectsCountService } = require("../services/subjectsService");
const createSubjectSchema = require("../utils/subjectsValidate");


/**
 * @description Add a new subject to a class
 * @route POST /api/subjects
 * @method POST
 * @access private (school owner, assistant)
 */
exports.createSubjectController = async (req, res) => {
    try {
        // 0. Get school ID from token
        const schoolId = req.user.schoolId;

        // 1. validate data (Name, ClassId, TeacherId if provided)
        const { error, value } = createSubjectSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }
        const reqData = value;

        // 3. create subject
        const newSubject = await createSubjectService(schoolId, reqData);
        return res.status(201).json({ message: "Subject created successfully", newSubject });
    } catch (error) {
        console.error("Subject Controller Error:", error);
        return res.status(error.statusCode || 500).json({ message: error.message || "Internal server error" });
    }
}


/**
 * @description get all subjects in a school
 * @route GET /api/subjects
 * @method GET
 * @access private (school owner, assistant)
 */

exports.getAllSubjectsController = async (req, res) => {
    try {
        // 0. Get school ID from token
        const schoolId = req.user.schoolId;

        // 1. get all subjects
        const subjects = await getAllSubjectsService(schoolId);
        return res.status(200).json({ message: "Subjects retrieved successfully", subjects });
    } catch (error) {
        console.error("Subject Controller Error:", error);
        return res.status(error.statusCode || 500).json({ message: error.message || "Internal server error" });
    }
}

/**
 * @description get a subject by id
 * @route GET /api/subjects/:id
 * @method GET
 * @access private (school owner, assistant)
 */
exports.getSubjectByIdController = async (req, res) => {
    try {
        // 0. Get school ID from token
        const schoolId = req.user.schoolId;

        // 1. get subject by id
        const subject = await getSubjectByIdService(schoolId, req.params.id);
        return res.status(200).json({ message: "Subject retrieved successfully", subject });
    } catch (error) {
        console.error("Subject Controller Error:", error);
        return res.status(error.statusCode || 500).json({ message: error.message || "Internal server error" });
    }
}
