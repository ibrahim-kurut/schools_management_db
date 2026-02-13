const { createSubscriptionRequestService, getSubscriptionRequestsService } = require("../services/subscriptionService");
const { createSubscriptionRequestSchema } = require("../utils/subscriptionValidate");

/**
 * @description Create a subscription request (School Admin)
 * @route POST /api/subscriptions/request
 * @access private (School Admin only)
 */
exports.createSubscriptionRequestController = async (req, res) => {
    try {
        // Validate request body
        const { error } = createSubscriptionRequestSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });
        }

        const { planId, paymentReceipt } = req.body;
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

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};


/**
 * @description Get a subscriptions requests
 * @route /api/subscriptions/requests
 * @method GET
 * @access private (Super Admin only)
 */

exports.getSubscriptionRequestsController = async (req, res) => {
    try {
        const { status } = req.query; // Optional: ?status=PENDING

        const requests = await getSubscriptionRequestsService(status);

        res.status(200).json({
            success: true,
            message: "Subscription requests retrieved successfully",
            data: requests,
            count: requests.length
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
}