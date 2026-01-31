const prisma = require("../utils/prisma");

/**
 * @description create a new academic year
 * @route POST /api/academic-years
 * @method POST
 * @access private (school owner, assistant)
 */
exports.createAcademicYearService = async (schoolId, reqData) => {
    // 1 . check if the school exists
    const school = await prisma.school.findUnique({
        where: { id: schoolId }
    });
    if (!school) {
        return { status: "NOT_FOUND", message: "School not found" };
    }

    // 2. check if the academic year already exists
    const academicYear = await prisma.academicYear.findFirst({
        where: { name: reqData.name, schoolId: schoolId }
    });
    if (academicYear) {
        return { status: "CONFLICT", message: "Academic year already exists" };
    }

    // 3. handle isCurrent logic
    if (reqData.isCurrent) {
        await prisma.academicYear.updateMany({
            where: { schoolId: schoolId },
            data: { isCurrent: false }
        });
    }

    // 4. create the academic year
    const newAcademicYear = await prisma.academicYear.create({
        data: { ...reqData, schoolId: schoolId }
    });

    return { status: "SUCCESS", message: "Academic year created successfully", academicYear: newAcademicYear };
};