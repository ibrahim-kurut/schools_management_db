const prisma = require("../utils/prisma");

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
    return await prisma.subject.create({
        data: { name, classId, teacherId },
        include: {
            class: { select: { name: true } },
            teacher: { select: { firstName: true, lastName: true } }
        }
    });
}

/**
 * @description get all subjects in a school
 * @route GET /api/subjects
 * @method GET
 * @access private (school owner, assistant)
 */

exports.getAllSubjectsService = async (schoolId) => {
    try {
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
        return subjects;
    } catch (error) {
        throw error;
    }
}

/**
 * @description get a subject by id
 * @route GET /api/subjects/:id
 * @method GET
 * @access private (school owner, assistant)
 */
exports.getSubjectByIdService = async (schoolId, id) => {
    try {
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
        return subject;
    } catch (error) {
        throw error;
    }
}