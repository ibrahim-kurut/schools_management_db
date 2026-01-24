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



    // const teacher = 
    // 4. Create subject
    return await prisma.subject.create({
        data: { name, classId, teacherId },
        include: {
            class: { select: { name: true } },
            teacher: { select: { firstName: true, lastName: true } }
        }
    });
}