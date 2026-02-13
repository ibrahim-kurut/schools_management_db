const joi = require("joi");

// Create subscription request (School Admin)
const createSubscriptionRequestSchema = joi.object({
    planId: joi.string().uuid().required().messages({
        'string.empty': 'Plan ID is required',
        'string.uuid': 'Plan ID must be a valid UUID',
        'any.required': 'Plan ID is required'
    }),
    paymentReceipt: joi.string().uri().optional().allow(null, '').messages({
        'string.uri': 'Payment receipt must be a valid URL'
    })
});

module.exports = {
    createSubscriptionRequestSchema
};
