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
            return { status: "NOT_FOUND", message: "المدرسة غير موجودة." };

        }

        // 3. check if the class exists in this school

        const classExists = await prisma.class.findFirst({
            where: {
                name: classData.name,
                schoolId: schoolId,
            },
        });
        if (classExists) {
            return { status: "CONFLICT", message: `الصف "${classData.name}" موجود مسبقاً في مدرستك.` };
        }

        // 4. create the class
        const newClass = await prisma.class.create({
            data: {
                name: classData.name,
                tuitionFee: classData.tuitionFee || 0,
                schoolId: schoolId,
            },
            include: {
                _count: {
                    select: {
                        students: {
                            where: { isDeleted: false, role: 'STUDENT' }
                        }
                    }
                }
            }
        });

        const mappedClass = {
            ...newClass,
            studentsCount: newClass._count.students
        };

        // 5. Invalidate Caches
        await redis.del(`school:${schoolId}:classes`);
        await redis.del(`school:${schoolId}:stats`);

        // 6. return the class
        return {
            status: "SUCCESS",
            message: "تم إنشاء الصف بنجاح.",
            class: mappedClass
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
exports.getAllClassesService = async (schoolId, schoolSlug = null) => {
    try {
        let finalSchoolId = schoolId;

        // If slug is provided, it takes priority as it represents the current UI context
        if (schoolSlug) {
            const decodedSlug = decodeURIComponent(schoolSlug);
            const schoolBySlug = await prisma.school.findUnique({
                where: { slug: decodedSlug }
            });

            if (schoolBySlug) {
                finalSchoolId = schoolBySlug.id;
            } else {
                // Try case-insensitive just in case
                const schoolInsensitive = await prisma.school.findFirst({
                   where: { slug: { equals: decodedSlug, mode: 'insensitive' } }
                });
                if (schoolInsensitive) finalSchoolId = schoolInsensitive.id;
            }
        }

        if (!finalSchoolId) {
            return { status: "NOT_FOUND", message: "لم يتم العثور على مدرسة مرتبطة. يرجى تسجيل الخروج والدخول مرة أخرى." };
        }

        // 2. check if the school exists
        const school = await prisma.school.findUnique({
            where: { id: finalSchoolId }
        });

        if (!school) {
            return { status: "NOT_FOUND", message: "المدرسة غير موجودة." };
        }

        // 0. Check Redis Cache
        const cacheKey = `school:${finalSchoolId}:classes`;
        try {
            const cachedData = await redis.get(cacheKey);
            if (cachedData) {
                return JSON.parse(cachedData);
            }
        } catch (redisError) {
            console.error("Redis Error:", redisError);
        }

        // 3. get all classes with student count
        const classes = await prisma.class.findMany({
            where: {
                schoolId: finalSchoolId,
                isDeleted: false
            },
            include: {
                _count: {
                    select: {
                        students: {
                            where: { isDeleted: false, role: 'STUDENT' }
                        }
                    }
                }
            }
        });

        // Map classes to include studentsCount for the frontend
        const mappedClasses = classes.map(cls => ({
            ...cls,
            studentsCount: cls._count?.students || 0
        }));

        // 5. return the classes
        const result = {
            status: "SUCCESS",
            message: "تم جلب الصفوف بنجاح.",
            classes: mappedClasses
        };

        // 6. Save to Redis Cache (1 hour)
        try {
            await redis.set(cacheKey, JSON.stringify(result), 'EX', 3600);
        } catch (redisError) {
            console.error("Redis Error:", redisError);
        }

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
        // 0. Check Redis Cache
        const cacheKey = `school:${schoolId}:class:${classId}:students`;
        try {
            const cached = await redis.get(cacheKey);
            if (cached) return JSON.parse(cached);
        } catch (err) {
            console.error("Redis Get Error:", err);
        }

        // Optimized: Single query to check existence and fetch students
        const classWithStudents = await prisma.class.findFirst({
            where: {
                id: classId,
                schoolId: schoolId,
                isDeleted: false
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
            return { status: "NOT_FOUND", message: "الصف المطلوب غير موجود في سجلات مدرستك." };
        }

        if (classWithStudents.students.length === 0) {
            return { status: "NOT_FOUND", message: "لا يوجد طلاب مسجلين في هذا الصف." };
        }

        const result = {
            status: "SUCCESS",
            message: "Students fetched successfully",
            students: classWithStudents.students,
        };

        // 4. Save to Redis Cache (30 minutes)
        try {
            await redis.set(cacheKey, JSON.stringify(result), 'EX', 1800);
        } catch (err) {
            console.error("Redis Set Error:", err);
        }

        return result;
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
                isDeleted: false
            },
            include: {
                students: {
                    where: { role: "STUDENT", isDeleted: false },
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
                },
                _count: {
                    select: {
                        students: {
                            where: { isDeleted: false, role: 'STUDENT' }
                        }
                    }
                }
            }
        });
        if (!classExists) {
            return { status: "NOT_FOUND", message: "الصف غير موجود." };
        }

        const classData = {
            ...classExists,
            studentsCount: classExists._count.students
        };

        // 3. return the class
        const result = {
            status: "SUCCESS",
            message: "Class fetched successfully",
            class: classData
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
                isDeleted: false
            },
        });
        if (!classExists) {
            return { status: "NOT_FOUND", message: "الصف غير موجود." };
        }

        // 2.5 Check if another class with the same new name exists
        if (classData.name && classData.name !== classExists.name) {
            const nameConflict = await prisma.class.findFirst({
                where: {
                    name: classData.name,
                    schoolId: schoolId,
                    id: { not: classId } // Exclude the current class
                }
            });
            if (nameConflict) {
                return { status: "CONFLICT", message: `عذراً، الصف "${classData.name}" موجود مسبقاً في مدرستك.` };
            }
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
            include: {
                _count: {
                    select: {
                        students: {
                            where: { isDeleted: false, role: 'STUDENT' }
                        }
                    }
                }
            }
        });

        const mappedClass = {
            ...updatedClass,
            studentsCount: updatedClass._count.students
        };

        // 4. return the class
        const result = {
            status: "SUCCESS",
            message: "تم تحديث الصف بنجاح.",
            class: mappedClass
        };

        // 5. Invalidate Caches (List + Item + Students + Stats)
        await redis.del(`school:${schoolId}:classes`);
        await redis.del(`school:${schoolId}:class:${classId}`);
        await redis.del(`school:${schoolId}:class:${classId}:students`);
        await redis.del(`school:${schoolId}:stats`);

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
                isDeleted: false
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
            return { status: "NOT_FOUND", message: "الصف غير موجود." };
        }

        let isDeleteClass = true;

        if (targetClass._count.students > 0) {
            isDeleteClass = false;
            return { status: "NOT_ALLOWED", message: "لا يمكن حذف الصف الدراسي لاحتوائه على طلاب مسجلين." };
        }


        // 3. delete the class (Soft Delete)
        let deletedClass = null;
        if (isDeleteClass) {
            deletedClass = await prisma.class.update({
                where: {
                    id: classId,
                },
                data: {
                    isDeleted: true,
                    deletedAt: new Date(),
                    name: `${targetClass.name}_deleted_${Date.now()}` // Rename to free up name
                }
            });
        }

        // 5. Invalidate Caches (List + Item + Students + Stats)
        await redis.del(`school:${schoolId}:classes`);
        await redis.del(`school:${schoolId}:class:${classId}`);
        await redis.del(`school:${schoolId}:class:${classId}:students`);
        await redis.del(`school:${schoolId}:stats`);

        return {
            status: "SUCCESS",
            message: "تم حذف الصف بنجاح.",
            class: deletedClass
        };

    } catch (error) {
        throw error;
    }
};