const prisma = require("../utils/prisma");

/**
 * @description Create a new note
 */
exports.createNote = async (teacherId, data) => {
    const { classId, content } = data;

    // 1. Check if the teacher teaches any subject in this class
    const teachesInClass = await prisma.subject.findFirst({
        where: {
            teacherId: teacherId,
            classId: classId
        }
    });

    if (!teachesInClass) {
        throw new Error("لا يمكنك إضافة ملاحظة لصف لا تدرسه");
    }

    // 2. Create the note
    return await prisma.note.create({
        data: {
            content,
            classId,
            teacherId
        },
        include: {
            teacher: {
                select: {
                    firstName: true,
                    lastName: true,
                    image: true
                }
            }
        }
    });
};

/**
 * @description Get notes for a specific class
 */
exports.getClassNotes = async (classId) => {
    return await prisma.note.findMany({
        where: { classId },
        orderBy: { createdAt: 'desc' },
        include: {
            teacher: {
                select: {
                    firstName: true,
                    lastName: true,
                    image: true
                }
            }
        }
    });
};

/**
 * @description Update a note
 */
exports.updateNote = async (noteId, teacherId, content) => {
    // 1. Find the note and verify ownership
    const note = await prisma.note.findUnique({
        where: { id: noteId }
    });

    if (!note) {
        throw new Error("الملاحظة غير موجودة");
    }

    if (note.teacherId !== teacherId) {
        throw new Error("لا تملك الصلاحية لتعديل هذه الملاحظة");
    }

    // 2. Update the note
    return await prisma.note.update({
        where: { id: noteId },
        data: { content },
        include: {
            teacher: {
                select: {
                    firstName: true,
                    lastName: true,
                    image: true
                }
            }
        }
    });
};

/**
 * @description Delete a note
 */
exports.deleteNote = async (noteId, teacherId) => {
    // 1. Find the note and verify ownership
    const note = await prisma.note.findUnique({
        where: { id: noteId }
    });

    if (!note) {
        throw new Error("الملاحظة غير موجودة");
    }

    if (note.teacherId !== teacherId) {
        throw new Error("لا تملك الصلاحية لحذف هذه الملاحظة");
    }

    // 2. Delete the note
    return await prisma.note.delete({
        where: { id: noteId }
    });
};
