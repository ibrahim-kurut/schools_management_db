const express = require("express");
const {
    createSubscriptionRequestController,
    getSubscriptionRequestsController,
    approveSubscriptionController,
    rejectSubscriptionController,
    getPendingRequestsCountController,
    getMySubscriptionController,
    getMyPendingRequestController,
    settleDebtController,
    addDebtController,
    updateSchoolSubscriptionController
} = require("../controllers/subscriptionController");
const { verifyToken, authorize } = require("../middleware/verifyToken");
const router = express.Router();

// School Admin: Get own subscription
router.get("/my-subscription", verifyToken, authorize("SCHOOL_ADMIN"), getMySubscriptionController);

// School Admin: Request subscription
router.post("/request", verifyToken, authorize("SCHOOL_ADMIN"), createSubscriptionRequestController);

// School Admin: Get my pending request
router.get("/my-pending-request", verifyToken, authorize("SCHOOL_ADMIN"), getMyPendingRequestController);

// Super Admin: Get pending requests count
router.get("/requests/count", verifyToken, authorize("SUPER_ADMIN"), getPendingRequestsCountController);

// Super Admin: Get all subscription requests (with optional status filter)
router.get("/requests", verifyToken, authorize("SUPER_ADMIN"), getSubscriptionRequestsController);

// Super Admin: Approve subscription request
router.post("/approve/:id", verifyToken, authorize("SUPER_ADMIN"), approveSubscriptionController);

// Super Admin: Reject subscription request
router.post("/reject/:id", verifyToken, authorize("SUPER_ADMIN"), rejectSubscriptionController);

// Super Admin: Settle debt for a school
router.post("/settle-debt/:schoolId", verifyToken, authorize("SUPER_ADMIN"), settleDebtController);

// Super Admin: Add debt for a school
router.post("/add-debt/:schoolId", verifyToken, authorize("SUPER_ADMIN"), addDebtController);

// Super Admin: Update school subscription status/plan
router.put("/update-school/:schoolId", verifyToken, authorize("SUPER_ADMIN"), updateSchoolSubscriptionController);

module.exports = router;
