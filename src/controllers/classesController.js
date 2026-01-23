const { createClassSchema, updateClassSchema } = require("../utils/classValidate");
const { validateId } = require("../utils/validateUUID");
const { createClassService, getAllClassesService, getClassStudentsService, getClassByIdService, updateClassService, deleteClassService } = require("../services/classesService");

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

/**
 * @description get class by ID with students list
 * @route GET /api/classes/:classId
 * @method GET
 * @access private (school owner and assistant)
 */
exports.getClassByIdController = async (req, res) => {
    try {
        //1.get school id from token
        const schoolId = req.user.schoolId;
        if (!schoolId) {
            return res.status(400).json({ message: "School ID is missing from token" });
        }
        //2.validate class id
        const { error, value } = validateId(req.params.classId);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }
        //3. Call and Passing values to Service
        const result = await getClassByIdService(schoolId, value.id);
        //4. handle service response
        if (result.status === "NOT_FOUND") {
            return res.status(404).json({ message: result.message });
        }
        //5. return class
        return res.status(200).json({
            message: result.message,
            class: result.class
        });

    } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * @description update class
 * @route PUT /api/classes/:classId
 * @method PUT
 * @access private (school owner and assistant)
 */
exports.updateClassController = async (req, res) => {
    try {
        //1.get school id from token
        const schoolId = req.user.schoolId;
        if (!schoolId) {
            return res.status(400).json({ message: "School ID is missing from token" });
        }
        //2.validate class id
        const { error, value } = validateId(req.params.classId);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        // 3. validate request

        const { error: updateClassError, value: updateClassValue } = updateClassSchema.validate(req.body);
        if (updateClassError) {
            return res.status(400).json({ message: updateClassError.details[0].message });
        }




        const classId = value.id;
        const classData = updateClassValue;

        //3. Call and Passing values to Service
        const result = await updateClassService(schoolId, classId, classData);
        //4. handle service response
        if (result.status === "NOT_FOUND") {
            return res.status(404).json({ message: result.message });
        }
        //5. return class
        return res.status(200).json({
            message: result.message,
            class: result.class
        });

    } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * @description delete class
 * @route DELETE /api/classes/:classId
 * @method DELETE
 * @access private (school owner and assistant)
 */

exports.deleteClassController = async (req, res) => {
    try {
        //1.get school id from token
        const schoolId = req.user.schoolId;
        if (!schoolId) {
            return res.status(400).json({ message: "School ID is missing from token" });
        }
        //2.validate class id
        const { error, value } = validateId(req.params.classId);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }
        const classId = value.id;

        //3. Call and Passing values to Service
        const result = await deleteClassService(schoolId, classId);
        //4. handle service response
        if (result.status === "NOT_FOUND") {
            return res.status(404).json({ message: result.message });
        }
        if (result.status === "NOT_ALLOWED") {
            return res.status(400).json({ message: result.message });
        }
        //5. return class
        return res.status(200).json({
            message: result.message,
            class: result.class
        });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
    }
}

