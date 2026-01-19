const { createClassSchema } = require("../utils/classValidate");
const { createClassService } = require("../services/classesService");

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


        console.log("user", req.user);


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