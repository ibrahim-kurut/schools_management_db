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

        // 3. Format Response
        let responseUser = newUser;

        // If it's a student, return the class name 
        if (newUser.role === "STUDENT" && newUser.class) {
            responseUser = {
                ...newUser,
                className: newUser.class.name,
                class: undefined
            };
        }


        // 3. Response
        res.status(201).json({
            message: "Member added successfully",
            user: responseUser
        });

    } catch (error) {
        console.log("Error in addMemberController:", error);

        // Handle expected business logic errors with 400 Bad Request
        if (error.message.includes("Plan limit reached") ||
            error.message === "User with this email already exists" ||
            error.message === "School plan is not active" ||
            error.message === "Class not found" ||
            error.message === "Request body cannot be empty"
        ) {
            return res.status(400).json({ message: error.message });
        }

        // Handle Not Found errors with 404
        if (error.message === "School not found for this user") {
            return res.status(404).json({ message: error.message });
        }

        // Handle Prisma Unique Constraint error (e.g., email already exists)
        if (error.code === 'P2002') {
            return res.status(400).json({ message: "User with this email already exists (Database Constraint)" });
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

        // 1. Extracting page and limit from query parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const searchWord = req.query.search || "";

        // 2. Passing values to Service
        const { school, members, totalMembers } = await getAllMembersService(req.user.id, page, limit, searchWord);

        res.status(200).json({
            message: "Members fetched successfully",
            school,
            members,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalMembers / limit),
                totalMembers: totalMembers,
                itemsPerPage: limit,
                hasNextPage: page < Math.ceil(totalMembers / limit),
                hasPreviousPage: page > 1
            }
        });
    } catch (error) {
        if (error.message === "School not found for this user") {
            return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: "Internal Server Error" });
    }
};

