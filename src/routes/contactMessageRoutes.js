const express = require("express");
const {
    createContactMessageController,
    getAllContactMessagesController,
    getContactMessageByIdController,
    markMessageAsReadController,
    deleteContactMessageController,
} = require("../controllers/contactMessageController");
const { verifyToken, authorize } = require("../middleware/verifyToken");

const router = express.Router();

// Public route for submitting messages from the demo page
router.post("/", createContactMessageController);

// Protected routes (Super Admin only)
router.use(verifyToken);
router.use(authorize(["SUPER_ADMIN"]));

router.get("/", getAllContactMessagesController);
router.get("/:id", getContactMessageByIdController);
router.patch("/:id/read", markMessageAsReadController);
router.delete("/:id", deleteContactMessageController);

module.exports = router;
