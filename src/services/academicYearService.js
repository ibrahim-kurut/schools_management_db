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
            where: {
                schoolId: schoolId,
                isDeleted: false
            },

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
        // 1. total academic years
        const totalAll = await prisma.academicYear.count({
            where: { schoolId: schoolId }
        });
        // 2. total deleted academic years
        const totalDeleted = await prisma.academicYear.count({
            where: { schoolId: schoolId, isDeleted: true }
        });
        // 3. total active academic years
        const totalActive = totalAll - totalDeleted;
        return {
            status: "SUCCESS",
            message: "Data retrieved",
            academicYears: academicYears,
            stats: {
                totalAcademicYears: totalAll,
                deletedAcademicYears: totalDeleted,
                activeAcademicYears: totalActive
            }
        };
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

/**
 * @description update academic year
 * @route PUT /api/academic-year/:id
 * @method PUT
 * @access private (school owner, assistant)
 */
exports.updateAcademicYearService = async (schoolId, academicYearId, reqData) => {
    try {
        // 1. check if the school exists
        const school = await prisma.school.findUnique({
            where: { id: schoolId }
        });
        if (!school) {
            return { status: "NOT_FOUND", message: "School not found" };
        }

        // 2. check if the academic year exists AND belongs to the school
        const academicYear = await prisma.academicYear.findUnique({
            where: { id: academicYearId, schoolId: schoolId }
        });
        if (!academicYear) {
            return { status: "NOT_FOUND", message: "Academic year not found" };
        }

        // 3. check if the name already exists
        if (reqData.name && reqData.name !== academicYear.name) {
            const existingName = await prisma.academicYear.findFirst({
                where: {
                    schoolId: schoolId,
                    name: reqData.name,
                    NOT: { id: academicYearId }
                }
            });
            if (existingName) {
                return { status: "CONFLICT", message: "Academic year name already exists" };
            }
        }

        // 4. validate dates logic (ensure endDate > startDate)
        let startDate = reqData.startDate ? new Date(reqData.startDate) : new Date(academicYear.startDate);
        let endDate = reqData.endDate ? new Date(reqData.endDate) : new Date(academicYear.endDate);

        if (endDate <= startDate) {
            return { status: "CONFLICT", message: "End date must be after start date" };
        }

        // 5. handle isCurrent logic
        if (reqData.isCurrent) {
            await prisma.academicYear.updateMany({
                where: { schoolId: schoolId, NOT: { id: academicYearId } }, // exclude current to avoid redundant update
                data: { isCurrent: false }
            });
        }

        // 6. update the academic year
        const updatedAcademicYear = await prisma.academicYear.update({
            where: { id: academicYearId },
            data: reqData
        });

        return { status: "SUCCESS", message: "Academic year updated successfully", academicYear: updatedAcademicYear };
    } catch (error) {
        throw error;
    }
}

/**
 * @description delete academic year
 * @route DELETE /api/academic-year/:id
 * @method DELETE
 * @access private (school owner, assistant)
 */
exports.deleteAcademicYearService = async (schoolId, academicYearId) => {
    try {
        // 1. check if the school exists
        const school = await prisma.school.findUnique({
            where: { id: schoolId }
        });
        if (!school) {
            return { status: "NOT_FOUND", message: "School not found" };
        }

        // 2. check if the academic year exists AND belongs to the school
        const academicYear = await prisma.academicYear.findUnique({
            where: { id: academicYearId, schoolId: schoolId }
        });
        if (!academicYear) {
            return { status: "NOT_FOUND", message: "Academic year not found" };
        }

        // 3. delete the academic year (Soft Delete with Rename)
        const deletedAcademicYear = await prisma.academicYear.update({
            where: { id: academicYearId },
            data: {
                isDeleted: true,
                name: `${academicYear.name}_deleted_${Date.now()}` // Rename to free up the name
            }
        });

        return { status: "SUCCESS", message: "Academic year deleted successfully", academicYear: deletedAcademicYear };
    } catch (error) {
        throw error;
    }
}
