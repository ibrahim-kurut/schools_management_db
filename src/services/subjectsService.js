const prisma = require("../utils/prisma");
const redis = require("../config/redis");

/**
 * @description Add a new subject to a class
 * @route POST /api/subjects
 * @method POST
 * @access private (school owner, assistant)
 */

exports.createSubjectService = async (schoolId, reqData) => {
    const { name, classId, teacherId } = reqData;

    // 1. Check if class exists and belongs to this school
    const classExists = await prisma.class.findFirst({
        where: { id: classId, schoolId }
    });

    if (!classExists) {
        const error = new Error("Class not found or does not belong to this school");
        error.statusCode = 404;
        throw error;
    }

    // 2. Check if subject already exists in this class
    const subjectExists = await prisma.subject.findFirst({
        where: { name, classId }
    });

    if (subjectExists) {
        const error = new Error("Subject already exists in this class");
        error.statusCode = 409;
        throw error;
    }

    // 3. If teacherId provided, check if teacher exists and belongs to this school
    if (teacherId) {
        const teacherExists = await prisma.user.findFirst({
            where: { id: teacherId, schoolId, role: "TEACHER" }
        });

        if (!teacherExists) {
            const error = new Error("Teacher not found or does not belong to this school");
            error.statusCode = 404;
            throw error;
        }
    }

    // 4. Create subject
    const newSubject = await prisma.subject.create({
        data: { name, classId, teacherId },
        include: {
            class: { select: { name: true } },
            teacher: { select: { firstName: true, lastName: true } }
        }
    });

    // 5. Invalidate List Cache
    await redis.del(`school:${schoolId}:subjects`);

    return newSubject;
}

/**
 * @description get all subjects in a school
 * @route GET /api/subjects
 * @method GET
 * @access private (school owner, assistant)
 */

exports.getAllSubjectsService = async (schoolId) => {
    try {
        // 0. Check Redis Cache
        const cacheKey = `school:${schoolId}:subjects`;
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData);
        }

        // 1. get all subjects for this school by filtering through the Class relation
        const subjects = await prisma.subject.findMany({
            where: {
                class: {
                    schoolId: schoolId
                }
            },
            include: {
                class: {
                    select: { name: true }
                },
                teacher: {
                    select: { firstName: true, lastName: true }
                }
            },
        });

        // 2. Save to Redis Cache (1 hour)
        await redis.set(cacheKey, JSON.stringify(subjects), 'EX', 3600);

        return subjects;
    } catch (error) {
        throw error;
    }
};

/**
 * @description get a subject by id
 * @route GET /api/subjects/:id
 * @method GET
 * @access private (school owner, assistant)
 */
exports.getSubjectByIdService = async (schoolId, id) => {
    try {
        // 0. Check Redis Cache
        const cacheKey = `school:${schoolId}:subject:${id}`;
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData);
        }

        // 1. get subject by id and ensure it belongs to this school
        const subject = await prisma.subject.findFirst({
            where: {
                id: id,
                class: { schoolId: schoolId }
            },
            include: {
                class: {
                    select: { name: true }
                },
                teacher: {
                    select: { firstName: true, lastName: true }
                }
            },
        });

        // 2. Save to Redis Cache (1 hour)
        if (subject) {
            await redis.set(cacheKey, JSON.stringify(subject), 'EX', 3600);
        }

        return subject;
    } catch (error) {
        throw error;
    }
};

/**
 * @description update a subject by id
 * @route PUT /api/subjects/:id
 * @method PUT
 * @access private (school owner, assistant)
 */
exports.updateSubjectService = async (schoolId, subjectIdValue, reqData) => {
    const { id } = subjectIdValue;
    const { name, teacherId, classId } = reqData; // data from request body

    const subjectName = name.toLowerCase();

    // 1. Check if subject exists and belongs to this school
    const existingSubject = await prisma.subject.findFirst({
        where: { id, class: { schoolId } },
        select: { id: true, name: true, classId: true }
    });

    if (!existingSubject) {
        const error = new Error("Subject not found or does not belong to this school");
        error.statusCode = 404;
        throw error;
    }

    // 2. Check if user is trying to change the class
    if (classId && classId !== existingSubject.classId) {
        const error = new Error("You cannot move the subject to another class");
        error.statusCode = 400;
        throw error;
    }

    // 3. Check if name is already taken in the same class
    if (subjectName && subjectName !== existingSubject.name.toLowerCase()) {
        const nameConflict = await prisma.subject.findFirst({
            where: {
                name: { equals: subjectName, mode: 'insensitive' },
                classId: existingSubject.classId,
                NOT: { id: id }
            }
        });

        if (nameConflict) {
            const error = new Error("This name is already taken in this class");
            error.statusCode = 409;
            throw error;
        }
    }

    // 4. Check if teacher exists and belongs to this school
    if (teacherId) {
        const validTeacher = await prisma.user.findFirst({
            where: { id: teacherId, schoolId, role: "TEACHER" }
        });

        if (!validTeacher) {
            const error = new Error("Teacher not found or does not belong to this school");
            error.statusCode = 404;
            throw error;
        }
    }

    // 5. Update subject
    const updatedSubject = await prisma.subject.update({
        where: { id },
        data: {
            name: subjectName || undefined,
            teacherId: teacherId === null ? null : (teacherId || undefined)
        },
        include: {
            class: { select: { name: true } },
            teacher: { select: { firstName: true, lastName: true } }
        }
    });

    // 6. Invalidate Caches (List + Item)
    await redis.del(`school:${schoolId}:subjects`);
    await redis.del(`school:${schoolId}:subject:${id}`);

    return updatedSubject;
};

/**
 * @description delete a subject by id
 * @route DELETE /api/subjects/:id
 * @method DELETE
 * @access private (school owner, assistant)
 */
exports.deleteSubjectService = async (schoolId, subjectIdValue) => {
    const { id } = subjectIdValue;

    // 1. Check if subject exists and belongs to this school
    const existingSubject = await prisma.subject.findFirst({
        where: { id, class: { schoolId } },
        select: { id: true, name: true, classId: true }
    });

    if (!existingSubject) {
        const error = new Error("Subject not found or does not belong to this school");
        error.statusCode = 404;
        throw error;
    }

    // 2. Delete subject
    const deletedSubject = await prisma.subject.delete({
        where: { id },
        include: {
            class: { select: { name: true } },
            teacher: { select: { firstName: true, lastName: true } }
        }
    });

    // 3. Invalidate Caches (List + Item)
    await redis.del(`school:${schoolId}:subjects`);
    await redis.del(`school:${schoolId}:subject:${id}`);

    return deletedSubject;
};