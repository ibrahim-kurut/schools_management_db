const express = require("express");
const {
    createSubscriptionRequestController,
    getSubscriptionRequestsController,
    approveSubscriptionController,
    rejectSubscriptionController,
    getPendingRequestsCountController
} = require("../controllers/subscriptionController");
const { verifyToken, authorize } = require("../middleware/verifyToken");
const router = express.Router();

// School Admin: Request subscription
router.post("/request", verifyToken, authorize("SCHOOL_ADMIN"), createSubscriptionRequestController);

// Super Admin: Get pending requests count
router.get("/requests/count", verifyToken, authorize("SUPER_ADMIN"), getPendingRequestsCountController);

// Super Admin: Get all subscription requests (with optional status filter)
router.get("/requests", verifyToken, authorize("SUPER_ADMIN"), getSubscriptionRequestsController);

// Super Admin: Approve subscription request
router.post("/approve/:id", verifyToken, authorize("SUPER_ADMIN"), approveSubscriptionController);

// Super Admin: Reject subscription request
router.post("/reject/:id", verifyToken, authorize("SUPER_ADMIN"), rejectSubscriptionController);

module.exports = router;
