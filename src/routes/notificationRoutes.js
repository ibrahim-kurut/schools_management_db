const express = require("express");
const {
    getUserNotificationsController,
    markAsReadController,
    markAllAsReadController
} = require("../controllers/notificationController");
const { verifyToken } = require("../middleware/verifyToken");

const router = express.Router();

router.use(verifyToken);

router.get("/", getUserNotificationsController);
router.patch("/read-all", markAllAsReadController);
router.patch("/:id/read", markAsReadController);

module.exports = router;
