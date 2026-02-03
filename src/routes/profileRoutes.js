const express = require("express");
const router = express.Router();
const { getUserProfileController } = require("../controllers/profileController");
const { verifyToken } = require("../middleware/verifyToken");

router.get("/", verifyToken, getUserProfileController);

module.exports = router;