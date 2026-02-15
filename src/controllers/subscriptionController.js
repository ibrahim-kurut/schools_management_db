const {
    createSubscriptionRequestService,
    getSubscriptionRequestsService,
    approveSubscriptionService,
    rejectSubscriptionService,
    getPendingRequestsCountService
} = require("../services/subscriptionService");
const {
    createSubscriptionRequestSchema,
    approveSubscriptionSchema,
    rejectSubscriptionSchema
} = require("../utils/subscriptionValidate");
const asyncHandler = require("../utils/asyncHandler");

/**
 * @description Create a subscription request (School Admin)
 * @route POST /api/subscriptions/request
 * @access private (School Admin only)
 */
exports.createSubscriptionRequestController = asyncHandler(async (req, res) => {
    // Validate request body and convert values (trim, etc.)
    const { error, value } = createSubscriptionRequestSchema.validate(req.body, { convert: true });
    if (error) {
        return res.status(400).json({
            success: false,
            message: error.details[0].message
        });
    }

    const { planId, paymentReceipt } = value;
    const schoolId = req.user.schoolId;

    if (!schoolId) {
        return res.status(403).json({
            success: false,
            message: "You must be a school admin to create a subscription request"
        });
    }

    const newRequest = await createSubscriptionRequestService(schoolId, planId, paymentReceipt);

    res.status(201).json({
        success: true,
        message: "Subscription request created successfully",
        data: newRequest
    });
});


/**
 * @description Get subscription requests (Super Admin)
 * @route /api/subscriptions/requests
 * @method GET
 * @access private (Super Admin only)
 */
exports.getSubscriptionRequestsController = asyncHandler(async (req, res) => {
    const { status } = req.query; // Optional: ?status=PENDING

    const requests = await getSubscriptionRequestsService(status);

    res.status(200).json({
        success: true,
        message: "Subscription requests retrieved successfully",
        data: requests,
        count: requests.length
    });
});

/**
 * @description Approve a subscription request (Super Admin)
 * @route POST /api/subscriptions/approve/:id
 * @access private (Super Admin only)
 */
exports.approveSubscriptionController = asyncHandler(async (req, res) => {
    // Validate request body and convert values (trim, etc.)
    const { error, value } = approveSubscriptionSchema.validate(req.body, { convert: true });
    if (error) {
        return res.status(400).json({
            success: false,
            message: error.details[0].message
        });
    }

    const { id } = req.params;
    const { adminNotes } = value || {}; // Use validated & converted value

    const result = await approveSubscriptionService(id, adminNotes);

    res.status(200).json({
        success: true,
        message: "Subscription request approved successfully",
        data: result
    });
});

/**
 * @description Reject a subscription request (Super Admin)
 * @route POST /api/subscriptions/reject/:id
 * @access private (Super Admin only)
 */
exports.rejectSubscriptionController = asyncHandler(async (req, res) => {
    // Validate request body and convert values (trim, etc.)
    const { error, value } = rejectSubscriptionSchema.validate(req.body, { convert: true });
    if (error) {
        return res.status(400).json({
            success: false,
            message: error.details[0].message
        });
    }

    const { id } = req.params;
    const { adminNotes } = value || {}; // Use validated & converted value

    const result = await rejectSubscriptionService(id, adminNotes);

    res.status(200).json({
        success: true,
        message: "Subscription request rejected successfully",
        data: result
    });
});

/**
 * @description Get pending requests count (Super Admin)
 * @route GET /api/subscriptions/requests/count
 * @access private (Super Admin only)
 */
exports.getPendingRequestsCountController = asyncHandler(async (req, res) => {
    const count = await getPendingRequestsCountService();
    res.status(200).json({
        success: true,
        data: { count }
    });
});
