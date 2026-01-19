const prisma = require("../utils/prisma");

/**
 * @description create a new class
 * @route POST /api/classes
 * @method POST
 * @access private (school owner)
 */
exports.createClassService = async (schoolId, classData) => {
    try {

        // 2. check if the school exists
        const school = await prisma.school.findUnique({
            where: { id: schoolId }
        });

        if (!school) {
            return { status: "NOT_FOUND", message: "School not found" };

        }

        // 3. check if the class exists in this school

        const classExists = await prisma.class.findFirst({
            where: {
                name: classData.name,
                schoolId: schoolId,
            },
        });
        if (classExists) {
            return { status: "CONFLICT", message: "Class already exists" };
        }

        // 4. create the class
        const newClass = await prisma.class.create({
            data: {
                name: classData.name,
                tuitionFee: classData.tuitionFee || 0,
                schoolId: schoolId,
            },
        });

        // 5. return the class
        return {
            status: "SUCCESS",
            message: "Class created successfully",
            class: newClass
        };

    } catch (error) {
        throw error;
    }
};