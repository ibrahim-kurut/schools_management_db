const express = require("express");
const router = express.Router();
const noteController = require("../controllers/noteController");
const { verifyToken, authorize } = require("../middleware/verifyToken");

/**
 * @route POST /api/notes
 * @desc Create a note (Teacher only)
 * @access Private
 */
router.post(
    "/",
    verifyToken,
    authorize(["TEACHER"]),
    noteController.createNote
);

/**
 * @route GET /api/notes/class/:classId
 * @desc Get notes for a class (Teacher and Students)
 * @access Private
 */
router.get(
    "/class/:classId",
    verifyToken,
    authorize(["TEACHER", "STUDENT", "SCHOOL_ADMIN", "ASSISTANT"]),
    noteController.getClassNotes
);

/**
 * @route PUT /api/notes/:noteId
 * @desc Update a note (Teacher owner only - ownership checked in service)
 * @access Private
 */
router.put(
    "/:noteId",
    verifyToken,
    authorize(["TEACHER"]),
    noteController.updateNote
);

/**
 * @route DELETE /api/notes/:noteId
 * @desc Delete a note (Teacher owner only - ownership checked in service)
 * @access Private
 */
router.delete(
    "/:noteId",
    verifyToken,
    authorize(["TEACHER"]),
    noteController.deleteNote
);

module.exports = router;
