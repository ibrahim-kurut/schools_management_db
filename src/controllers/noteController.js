const noteService = require("../services/noteService");
const { validateNote } = require("../utils/noteValidate");

/**
 * @description Create a new note
 */
exports.createNote = async (req, res, next) => {
    try {
        // 1. Validate data
        const { error } = validateNote(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });
        }

        // 2. Call service
        const teacherId = req.user.id;
        const note = await noteService.createNote(teacherId, req.body);

        res.status(201).json({
            success: true,
            message: "تم إضافة الملاحظة بنجاح",
            data: note
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @description Get notes for a class
 */
exports.getClassNotes = async (req, res, next) => {
    try {
        const { classId } = req.params;
        const notes = await noteService.getClassNotes(classId);

        res.status(200).json({
            success: true,
            data: notes
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @description Update a note
 */
exports.updateNote = async (req, res, next) => {
    try {
        const { noteId } = req.params;
        const { content } = req.body;
        const teacherId = req.user.id;

        if (!content || content.length < 5) {
            return res.status(400).json({
                success: false,
                message: "يجب أن يكون محتوى الملاحظة 5 أحرف على الأقل"
            });
        }

        const note = await noteService.updateNote(noteId, teacherId, content);

        res.status(200).json({
            success: true,
            message: "تم تحديث الملاحظة بنجاح",
            data: note
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @description Delete a note
 */
exports.deleteNote = async (req, res, next) => {
    try {
        const { noteId } = req.params;
        const teacherId = req.user.id;

        await noteService.deleteNote(noteId, teacherId);

        res.status(200).json({
            success: true,
            message: "تم حذف الملاحظة بنجاح"
        });
    } catch (error) {
        next(error);
    }
};
