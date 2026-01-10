const { createSchoolService } = require("../services/schoolsService");
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