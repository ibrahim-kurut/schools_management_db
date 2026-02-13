const express = require("express");
const { createSubscriptionRequestController, getSubscriptionRequestsController } = require("../controllers/subscriptionController");
const { verifyToken, authorize } = require("../middleware/verifyToken");
const router = express.Router();

// School Admin: Request subscription
router.post("/request", verifyToken, authorize("SCHOOL_ADMIN"), createSubscriptionRequestController);

// Super Admin: Get all subscription requests (with optional status filter)
router.get("/requests", verifyToken, authorize("SUPER_ADMIN"), getSubscriptionRequestsController);

module.exports = router;
