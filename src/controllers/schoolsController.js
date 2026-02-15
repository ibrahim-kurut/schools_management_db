const { createSchoolService, getAllSchoolsService, getSchoolByIdService, updateSchoolByIdService, deleteSchoolByIdService } = require("../services/schoolsService");
const { createSchoolSchema, updateSchoolSchema } = require("../utils/schoolValidate");
const { validateId } = require("../utils/validateUUID");
const asyncHandler = require("../utils/asyncHandler");

/**
 * @description Create a new school
 * @route POST /api/schools
 * @method POST
 * @access private (school admin only)
 */

exports.createSchool = asyncHandler(async (req, res) => {
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
});

/**
 * @description Get all schools
 * @route GET /api/schools
 * @method GET
 * @access private (super admin only)
 */

exports.getAllSchools = asyncHandler(async (req, res) => {
    const searchWord = req.query.search || "";

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
});

/**
 * @description Get school by id
 * @route GET /api/schools/:id
 * @method GET
 * @access private (get school by id only owner or super admin)
 */
exports.getSchoolById = asyncHandler(async (req, res) => {
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
});

/**
 * @description Update school by id
 * @route PUT /api/schools/:id
 * @method PUT
 * @access private (update school by id only owner or super admin)
 */
exports.updateSchoolById = asyncHandler(async (req, res) => {
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
});

/**
 * @description Delete school by id
 * @route DELETE /api/schools/:id
 * @method DELETE
 * @access private (delete school by id only owner or super admin)
 */
exports.deleteSchoolById = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;

    // 1. Extracting school id from params
    const { error: IdError, value: IdValue } = validateId(req.params.id);
    if (IdError) {
        return res.status(400).json({ message: IdError.details[0].message });
    }

    // 2. Passing values to Service
    const school = await deleteSchoolByIdService(IdValue.id, userId, userRole);

    // 3. Checking if school exists
    if (!school) {
        return res.status(404).json({ message: "School not found" });
    }

    // 4. Sending data
    res.status(200).json({ message: "School deleted successfully", school });
});

