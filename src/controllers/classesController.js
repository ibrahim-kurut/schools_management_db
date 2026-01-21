const { createClassSchema } = require("../utils/classValidate");
const { validateId } = require("../utils/validateUUID");
const { createClassService, getAllClassesService, getClassStudentsService } = require("../services/classesService");

/**
 * @description create a new class
 * @route POST /api/classes
 * @method POST
 * @access private (school owner)
 */
exports.createClassController = async (req, res) => {



    try {
        // get school id from token
        const schoolId = req.user.schoolId;
        if (!schoolId) {
            return res.status(400).json({ message: "School ID is missing from token" });
        }



        // 1. validate the request
        const { error, value } = createClassSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const result = await createClassService(schoolId, value);

        // 2-5. Handling service response
        if (result.status === "NOT_FOUND") {
            return res.status(404).json({ message: result.message });
        }

        if (result.status === "CONFLICT") {
            return res.status(400).json({ message: result.message });
        }

        // 6. return the class
        return res.status(201).json({
            message: result.message,
            class: result.class
        });



    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @description get all classes
 * @route GET /api/classes
 * @method GET
 * @access private (school owner)
 */
exports.getAllClassesController = async (req, res) => {
    try {
        // 1. get school id from token
        const schoolId = req.user.schoolId;
        if (!schoolId) {
            return res.status(400).json({ message: "School ID is missing from token" });
        }


        // 2. Passing values to Service
        const result = await getAllClassesService(schoolId);

        // 3. Handling service response
        if (result.status === "NOT_FOUND") {
            return res.status(404).json({ message: result.message });
        }

        // 4. return the classes
        return res.status(200).json({
            message: "Classes fetched successfully",
            classes: result.classes
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @description get students for a class
 * @route GET /api/classes/:classId/students
 * @method GET
 * @access private (school owner and assistant)
 */
exports.getClassStudentsController = async (req, res) => {
    try {
        // 1. get school id from token
        const schoolId = req.user.schoolId;
        if (!schoolId) {
            return res.status(400).json({ message: "School ID is missing from token" });
        }

        // 2. validate class id
        const { error, value } = validateId(req.params.classId);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }



        // 4. Call and Passing values to Service
        const result = await getClassStudentsService(schoolId, value.id);

        // 5. handle service response
        if (result.status === "NOT_FOUND") {
            return res.status(404).json({ message: result.message });
        }

        // 6. return students
        return res.status(200).json({
            message: result.message,
            students: result.students
        });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
    }
};
