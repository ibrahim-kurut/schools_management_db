const { addMemberService, getAllMembersService, getMemberByIdService, updateMemberByIdService } = require("../services/schoolUserService");
const { addSchoolMemberSchema, updateSchoolMemberSchema } = require("../utils/schoolUserValidate");
const { validateId } = require("../utils/validateUUID");

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

        // 2. Validate and set roleFilter
        const validRoles = ["TEACHER", "ASSISTANT", "ACCOUNTANT", "STUDENT"];
        const roleFromQuery = req.query.role?.toUpperCase();

        // If role is provided and valid, use it; otherwise, use undefined (no filter)
        const roleFilter = validRoles.includes(roleFromQuery) ? roleFromQuery : undefined;

        // 3. Passing values to Service
        const { school, members, totalMembers } = await getAllMembersService(req.user.id, page, limit, searchWord, roleFilter);

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

/**
 * @description  Get a member by ID
 * @route GET /api/school-user/:id
 * @method GET
 * @access private (school owner)
 */
exports.getMemberByIdController = async (req, res) => {
    try {
        // 1. Validate ID
        const { error, value } = validateId(req.params.id);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        // 2. Extract validated ID and Owner ID
        const memberId = value.id;  // ✅ Fixed: extract id from value object
        const ownerId = req.user.id;

        // 3. Call Service (Pass Owner ID + Member ID)
        const member = await getMemberByIdService(ownerId, memberId);

        // 4. Response
        res.status(200).json({
            message: "Member fetched successfully",
            member
        });
    } catch (error) {
        // Handle 404 errors
        if (error.message === "School not found for this user" ||
            error.message === "Member not found") {
            return res.status(404).json({ message: error.message });
        }

        // Handle 403 Forbidden - member doesn't belong to this school
        if (error.message === "Member does not belong to this school") {
            return res.status(403).json({ message: error.message });
        }

        res.status(500).json({ message: "Internal Server Error" });
    }
};

/**
 * @description Update a member
 * @route PUT /api/school-user/:id
 * @method PUT
 * @access private (school owner)
 */

exports.updateMemberByIdController = async (req, res) => {
    try {
        // 1. Validate ID
        const { error: idError, value: idValue } = validateId(req.params.id);
        if (idError) {
            return res.status(400).json({ message: idError.details[0].message });
        }

        // 2. Validate Body
        const { error: bodyError, value: bodyValue } = updateSchoolMemberSchema.validate(req.body);
        if (bodyError) {
            return res.status(400).json({ message: bodyError.details[0].message });
        }

        // 3. Extract validated ID and Owner ID
        const memberId = idValue.id;
        const ownerId = req.user.id;
        const reqData = bodyValue;

        // 4. Call Service (Pass Owner ID + Member ID + Request Data)
        const member = await updateMemberByIdService(ownerId, memberId, reqData);

        // 5. Response
        res.status(200).json({
            message: "Member updated successfully",
            member
        });
        console.log("res.statusCode .........", res.statusCode);

    }


    catch (error) {
        // Handle 404 errors
        if (error.message === "School not found for this user" ||
            error.message === "Member not found in this school") {
            return res.status(404).json({ message: error.message });
        }

        // Handle 400 Bad Request (Business Logic)
        if (error.message === "No valid fields to update for your role") {
            return res.status(400).json({ message: error.message });
        }

        // Handle Prisma Unique Constraint error (e.g., email already exists)
        if (error.code === 'P2002') {
            return res.status(400).json({ message: "User with this email already exists" });
        }

        console.error("Error in updateMemberByIdController:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


