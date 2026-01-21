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

/**
 * @description get all classes
 * @route GET /api/classes
 * @method GET
 * @access private (school owner and school assistant)
 */
exports.getAllClassesService = async (schoolId) => {
    try {
        // 2. check if the school exists

        const school = await prisma.school.findUnique({
            where: { id: schoolId }
        });

        if (!school) {
            return { status: "NOT_FOUND", message: "School not found" };
        }

        // 3. get all classes
        const classes = await prisma.class.findMany({
            where: {
                schoolId
            },
            select: {
                id: true,
                name: true,
                tuitionFee: true,
                _count: {
                    select: {
                        students: true
                    }
                }
            }
        });

        // 4. return the classes
        return {
            status: "SUCCESS",
            message: "Classes fetched successfully",
            classes: classes
        };
    } catch (error) {
        throw error;
    }
};

/**
 * @description get all students for a class
 * @route GET /api/classes/:classId/students
 * @method GET
 * @access private (school owner and assistant)
 */
exports.getClassStudentsService = async (schoolId, classId) => {
    try {

        // Optimized: Single query to check existence and fetch students
        const classWithStudents = await prisma.class.findFirst({
            where: {
                id: classId,
                schoolId: schoolId
            },
            include: {
                students: {
                    where: { role: "STUDENT" },
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        gender: true,
                        birthDate: true,
                        createdAt: true
                    }
                }
            }
        });


        if (!classWithStudents) {
            return { status: "NOT_FOUND", message: "The requested class was not found in your school records." };
        }

        if (classWithStudents.students.length === 0) {
            return { status: "NOT_FOUND", message: "No students found for this class." };
        }

        // 4. return students
        return {
            status: "SUCCESS",
            message: "Students fetched successfully",
            students: classWithStudents.students,
        };
    } catch (error) {
        throw error;
    }
};