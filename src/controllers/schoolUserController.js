const { addMemberService, getAllMembersService } = require("../services/schoolUserService");
const { addSchoolMemberSchema } = require("../utils/schoolUserValidate");

/**
 * @description Add a new member to a school
 * @route POST /api/school-user/
 * @method POST
 * @access private (school owner)
 */
exports.addMemberController = async (req, res) => {
    try {
        // 1. Validate Input
        const { error, value } = addSchoolMemberSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        // 2. Call Service (Pass Requester ID + Validated Body)
        // The service now handles: School Fetching, Plan Limits, Email Check, Password Hash, Creation
        const newUser = await addMemberService(req.user.id, value);

        // 3. Response
        res.status(201).json({
            message: "Member added successfully",
            user: newUser
        });

    } catch (error) {
        console.log("Error in addMemberController:", error);

        // Handle expected business logic errors with 400 Bad Request
        if (error.message.includes("Plan limit reached") ||
            error.message === "User with this email already exists" ||
            error.message === "School plan is not active" ||
            error.message === "Request body cannot be empty"
        ) {
            return res.status(400).json({ message: error.message });
        }

        // Handle Not Found errors with 404
        if (error.message === "School not found for this user") {
            return res.status(404).json({ message: error.message });
        }

        res.status(500).json({ message: "Internal Server Error" });
    }
};

/**
 * @description  Get all members of a school
 * @route GET /api/school-user
 * @method GET
 * @access private (school owner)
 */
exports.getAllMembersController = async (req, res) => {
    try {



        // 1. Passing values to Service
        const result = await getAllMembersService(req.user.id);

        res.status(200).json({
            message: "Members fetched successfully",
            result,
        });
    } catch (error) {
        console.log("Error in getAllMembersController:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

