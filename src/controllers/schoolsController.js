const { createSchoolService, getAllSchoolsService, getSchoolByIdService, updateSchoolByIdService } = require("../services/schoolsService");
const { createSchoolSchema, updateSchoolSchema } = require("../utils/schoolValidate");
const { validateId } = require("../utils/validateUUID");


/**
 * @description Create a new school
 * @route POST /api/schools
 * @method POST
 * @access private (school admin only)
 */

exports.createSchool = async (req, res) => {
    try {
        // 1. validate request
        const { error, value } = createSchoolSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        // إضافة معرف المستخدم من التوكن
        value.userId = req.user.id;


        // 2. create school
        const school = await createSchoolService(value);
        // 3. return school
        res.status(201).json({ message: "School created successfully", school });

    } catch (error) {
        console.log("Create school error:", error);

        // التحقق مما إذا كان الخطأ هو "المدرسة موجودة مسبقاً"
        if (error.message === "School already exists") {
            return res.status(400).json({ message: error.message });
        }

        // التحقق من أن المستخدم يملك مدرسة بالفعل
        if (error.code === 'P2002' && error.meta?.target?.includes('ownerId')) {
            return res.status(400).json({ message: "You already own a school. Each admin can own only one school." });
        }

        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * @description Get all schools
 * @route GET /api/schools
 * @method GET
 * @access private (super admin only)
 */

exports.getAllSchools = async (req, res) => {


    const searchWord = req.query.search || "";



    try {
        // 1. Extracting page and limit from query parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        // 2. Passing values to Service
        const result = await getAllSchoolsService(page, limit, searchWord);

        // 3. Checking if schools exist
        if (!result.schools || result.schools.length === 0) {
            return res.status(404).json({ message: "No schools found" });
        }

        // 4. Sending data with pagination info
        res.status(200).json({
            message: "Schools retrieved successfully",
            schools: result.schools,
            pagination: {
                currentPage: result.currentPage,
                totalPages: result.totalPages,
                totleSchools: result.totleSchools,
                itemsPerPage: limit,
                hasNextPage: result.hasNextPage,
                hasPreviousPage: result.hasPreviousPage
            }
        });
    } catch (error) {
        console.log("Get all schools error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * @description Get school by id
 * @route GET /api/schools/:id
 * @method GET
 * @access private (get school by id only owner or super admin)
 */
exports.getSchoolById = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        // 1. Extracting school id from params
        const { error: IdError, value: IdValue } = validateId(req.params.id);
        if (IdError) {
            return res.status(400).json({ message: IdError.details[0].message });
        }



        // 2. Passing values to Service
        const school = await getSchoolByIdService(IdValue.id, userId, userRole);

        // 3. Checking if school exists
        if (!school) {
            return res.status(404).json({ message: "School not found" });
        }

        // 4. Sending data
        res.status(200).json({ message: "School retrieved successfully", school });
    } catch (error) {
        console.log("Get school by id error:", error);

        // Handle authorization error
        if (error.message === "FORBIDDEN") {
            return res.status(403).json({ message: "You are not authorized to access this school" });
        }

        res.status(500).json({ message: "Internal Server Error" });
    }
}


/**
 * @description Update school by id
 * @route PUT /api/schools/:id
 * @method PUT
 * @access private (update school by id only owner or super admin)
 */
exports.updateSchoolById = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        // 1. Extracting school id from params
        const { error: IdError, value: IdValue } = validateId(req.params.id);
        if (IdError) {
            return res.status(400).json({ message: IdError.details[0].message });
        }

        // 2. validate data
        const { error, value } = updateSchoolSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        // 3. Passing data to Service
        const school = await updateSchoolByIdService(IdValue.id, value, userId, userRole);

        // 4. Checking if school exists
        if (!school) {
            return res.status(404).json({ message: "School not found" });
        }

        // 5. A warning message  if not a changes slug name
        let slugNameWarning = null;

        if (value.name && !value.slug) {
            // The user changed the name but did not send the slug.
            slugNameWarning = "School name updated but slug name unchanged. Update slug if needed";
        } else if (value.name && value.slug) {
            // The user sent both name and slug. Check if they match.
            const expectedSlug = value.name.toLowerCase().replace(/ /g, '-');
            if (expectedSlug !== value.slug.toLowerCase()) {
                slugNameWarning = "Name and slug do not match. This may cause confusion.";
            }
        }
        // 6. Sending data with optional warning
        res.status(200).json({
            message: "School updated successfully",
            school,
            ...(slugNameWarning && { slugNameWarning })
        });
    } catch (error) {
        console.log("Update school by id error:", error);

        // Handle authorization error
        if (error.message === "FORBIDDEN") {
            return res.status(403).json({ message: "You are not authorized to access this school" });
        }

        res.status(500).json({ message: "Internal Server Error" });
    }
}
