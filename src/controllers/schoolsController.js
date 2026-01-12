const { createSchoolService, getAllSchoolsService } = require("../services/schoolsService");
const { createSchoolSchema } = require("../utils/schoolValidate");


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
    console.log("searchWord ...........", searchWord);


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
