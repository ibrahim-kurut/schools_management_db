const { createSubjectService, getAllSubjectsService, getSubjectByIdService, getSubjectsCountService, updateSubjectService, deleteSubjectService } = require("../services/subjectsService");
const { createSubjectSchema, updateSubjectSchema } = require("../utils/subjectsValidate");
const { validateId } = require("../utils/validateUUID");


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

/**
 * @description update a subject by id
 * @route PUT /api/subjects/:id
 * @method PUT
 * @access private (school owner, assistant)
 */
exports.updateSubjectController = async (req, res) => {
    try {
        // 0. Get school ID from token
        const schoolId = req.user.schoolId;
        const subjectId = req.params.id;

        // 1. validate data (Name, ClassId, TeacherId if provided)
        const { error, value } = updateSubjectSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        // 2. validate subject id
        const { error: subjectIdError, value: subjectIdValue } = validateId(subjectId);
        if (subjectIdError) {
            return res.status(400).json({ message: subjectIdError.details[0].message });
        }

        const reqData = value;

        // 2. update subject by id
        const updatedSubject = await updateSubjectService(schoolId, subjectIdValue, reqData);
        return res.status(200).json({ message: "Subject updated successfully", updatedSubject });
    } catch (error) {
        console.error("Subject Controller Error:", error);
        return res.status(error.statusCode || 500).json({ message: error.message || "Internal server error" });
    }
}

/**
 * @description delete a subject by id
 * @route DELETE /api/subjects/:id
 * @method DELETE
 * @access private (school owner, assistant)
 */
exports.deleteSubjectController = async (req, res) => {
    try {
        // 0. Get school ID from token
        const schoolId = req.user.schoolId;
        const subjectId = req.params.id;

        // 1. validate subject id
        const { error: subjectIdError, value: subjectIdValue } = validateId(subjectId);
        if (subjectIdError) {
            return res.status(400).json({ message: subjectIdError.details[0].message });
        }

        // 2. delete subject by id
        const deletedSubject = await deleteSubjectService(schoolId, subjectIdValue);
        return res.status(200).json({ message: "Subject deleted successfully", deletedSubject });
    } catch (error) {
        console.error("Subject Controller Error:", error);
        return res.status(error.statusCode || 500).json({ message: error.message || "Internal server error" });
    }
}

