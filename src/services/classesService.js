const prisma = require("../utils/prisma");
const redis = require("../config/redis");

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

        // 5. Invalidate List Cache
        await redis.del(`school:${schoolId}:classes`);

        // 6. return the class
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

        // 0. Check Redis Cache
        const cacheKey = `school:${schoolId}:classes`;
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData);
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
        const result = {
            status: "SUCCESS",
            message: "Classes fetched successfully",
            classes: classes
        };

        // 5. Save to Redis Cache (1 hour)
        await redis.set(cacheKey, JSON.stringify(result), 'EX', 3600);

        return result;
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

/**
 * @description get class by ID with students list
 * @route GET /api/classes/:classId
 * @method GET
 * @access private (school owner and assistant)
 */
exports.getClassByIdService = async (schoolId, classId) => {

    try {
        // 0. Check Redis Cache
        const cacheKey = `school:${schoolId}:class:${classId}`;
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData);
        }

        // 2. check if the class exists in this school
        const classExists = await prisma.class.findFirst({
            where: {
                id: classId,
                schoolId: schoolId,
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
        if (!classExists) {
            return { status: "NOT_FOUND", message: "Class not found" };
        }
        // 3. return the class
        const result = {
            status: "SUCCESS",
            message: "Class fetched successfully",
            class: classExists
        };

        // 4. Save to Redis Cache (1 hour)
        await redis.set(cacheKey, JSON.stringify(result), 'EX', 3600);

        return result;
    } catch (error) {
        throw error;
    }

};

/**
 * @description update class
 * @route PUT /api/classes/:classId
 * @method PUT
 * @access private (school owner and assistant)
 */
exports.updateClassService = async (schoolId, classId, classData) => {
    try {
        console.log("classData from service", classData);
        // 2. check if the class exists in this school
        const classExists = await prisma.class.findFirst({
            where: {
                id: classId,
                schoolId: schoolId,
            },
        });
        if (!classExists) {
            return { status: "NOT_FOUND", message: "Class not found" };
        }
        // 3. update the class
        const updatedClass = await prisma.class.update({
            where: {
                id: classId,
            },
            data: {
                name: classData.name,
                tuitionFee: classData.tuitionFee,
            },
        });
        // 4. return the class
        const result = {
            status: "SUCCESS",
            message: "Class updated successfully",
            class: updatedClass
        };

        // 5. Invalidate Caches (List + Item)
        await redis.del(`school:${schoolId}:classes`);
        await redis.del(`school:${schoolId}:class:${classId}`);

        return result;
    } catch (error) {
        throw error;
    }
};

/**
 * @description delete class
 * @route DELETE /api/classes/:classId
 * @method DELETE
 * @access private (school owner and assistant)
 */

exports.deleteClassService = async (schoolId, classId) => {
    try {
        // 2. check if the class exists in this school
        const targetClass = await prisma.class.findFirst({
            where: {
                id: classId,
                schoolId: schoolId,
            },
            include: {
                _count: {
                    select: {
                        students: true
                    }
                }
            }
        });
        if (!targetClass) {
            return { status: "NOT_FOUND", message: "Class not found" };
        }

        let isDeleteClass = true;

        if (targetClass._count.students > 0) {
            isDeleteClass = false;
            return { status: "NOT_ALLOWED", message: "Class cannot be deleted as it has students" };
        }


        // 3. delete the class
        let deletedClass = null;
        if (isDeleteClass) {
            deletedClass = await prisma.class.delete({
                where: {
                    id: classId,
                },
            });
        }

        // 5. Invalidate Caches (List + Item)
        await redis.del(`school:${schoolId}:classes`);
        await redis.del(`school:${schoolId}:class:${classId}`);

        return {
            status: "SUCCESS",
            message: "Class deleted successfully",
            class: deletedClass
        };

    } catch (error) {
        throw error;
    }
};