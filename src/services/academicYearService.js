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

/**
 * @description get all academic years
 * @route GET /api/academic-year
 * @method GET
 * @access private (school owner, assistant)
 */

exports.getAcademicYearsService = async (schoolId) => {
    try {
        // 1. check if the school exists
        const school = await prisma.school.findUnique({
            where: { id: schoolId }
        });
        if (!school) {
            return { status: "NOT_FOUND", message: "School not found" };
        }

        // 2. get all academic years
        const academicYears = await prisma.academicYear.findMany({
            where: { schoolId: schoolId },
            include: {
                school: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // 3. return the academic years
        return { status: "SUCCESS", message: "Academic years retrieved successfully", academicYears: academicYears };
    } catch (error) {
        throw error;
    }
}

/**
 * @description get academic year by id
 * @route GET /api/academic-year/:id
 * @method GET
 * @access private (school owner, assistant)
 */
exports.getAcademicYearByIdService = async (schoolId, academicYearId) => {
    try {
        // 1. check if the school exists
        const school = await prisma.school.findUnique({
            where: { id: schoolId }
        });
        if (!school) {
            return { status: "NOT_FOUND", message: "School not found" };
        }

        // 2. get the academic year
        const academicYear = await prisma.academicYear.findUnique({
            where: { id: academicYearId },

            include: {
                school: {
                    select: {
                        name: true
                    }
                }
            }
        });
        if (!academicYear) {
            return { status: "NOT_FOUND", message: "Academic year not found" };
        }

        // 3. return the academic year
        return { status: "SUCCESS", message: "Academic year retrieved successfully", academicYear: academicYear };
    } catch (error) {
        throw error;
    }
}