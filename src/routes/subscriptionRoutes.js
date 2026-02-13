const express = require("express");
const { createSubscriptionRequestController } = require("../controllers/subscriptionController");
const { verifyToken, authorize } = require("../middleware/verifyToken");
const router = express.Router();

// School Admin: Request subscription
router.post("/request", verifyToken, authorize("SCHOOL_ADMIN"), createSubscriptionRequestController);

module.exports = router;
