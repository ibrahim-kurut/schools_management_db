const { createSchoolService, getAllSchoolsService, getSchoolByIdService, updateSchoolByIdService, deleteSchoolByIdService, getSchoolStatsOverviewService } = require("../services/schoolsService");
const { createSchoolSchema, updateSchoolSchema } = require("../utils/schoolValidate");
const { validateId } = require("../utils/validateUUID");
const asyncHandler = require("../utils/asyncHandler");
const supabase = require("../config/supabaseClient");

const BUCKET = process.env.SUPABASE_BUCKET || 'assets';

/**
 * @description Create a new school
 * @route POST /api/schools
 * @method POST
 * @access private (school admin only)
 */

exports.createSchool = asyncHandler(async (req, res) => {
    // 1. validate request text fields (Joi handles req.body)
    const { error, value } = createSchoolSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }

    // Add user id from the token as the school owner
    value.userId = req.user.id;

    // 2. Initial creation of the school
    let school = await createSchoolService(value);

    // 3. Optional: Upload logo if a file is provided in the same request
    if (req.file) {
        const { buffer, mimetype, originalname } = req.file;
        const extension = originalname.split('.').pop();
        const uniqueFileName = `schools/${school.id}/${Date.now()}.${extension}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(uniqueFileName, buffer, {
                contentType: mimetype,
                upsert: true,
            });

        if (uploadError) {
            console.error('Logo upload failed during school creation:', uploadError.message);
            // We return 201 because the school is created, but with a warning about the logo
            return res.status(201).json({
                message: "School created successfully, but logo upload failed.",
                warning: uploadError.message,
                school
            });
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(uniqueFileName);

        const logoUrl = publicUrlData.publicUrl;

        // Update the school record with the new logo URL
        // We use the same service for consistency
        school = await updateSchoolByIdService(school.id, { logo: logoUrl }, req.user.id, req.user.role);
    }

    // 4. Return success response
    res.status(201).json({ 
        message: "School created successfully", 
        school 
    });
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

    // 3. Passing data with pagination info
    res.status(200).json({
        message: result.schools.length === 0 ? "No schools yet" : "Schools retrieved successfully",
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

/**
 * @description Get school stats overview
 * @route GET /api/schools/stats/overview
 * @method GET
 * @access private
 */
exports.getSchoolStatsOverview = asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    if (!schoolId) {
        return res.status(400).json({ message: "School ID not found in token" });
    }

    const stats = await getSchoolStatsOverviewService(schoolId);
    res.status(200).json({
        message: "Stats retrieved successfully",
        stats
    });
});
