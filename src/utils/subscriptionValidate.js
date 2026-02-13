const joi = require("joi");

// Create subscription request (School Admin)
const createSubscriptionRequestSchema = joi.object({
    planId: joi.string().uuid().required().messages({
        'string.empty': 'Plan ID is required',
        'string.uuid': 'Plan ID must be a valid UUID',
        'any.required': 'Plan ID is required'
    }),
    paymentReceipt: joi.string().optional().allow(null, '').messages({
        'string.uri': 'Payment receipt must be a valid URL'
    })
});

// Approve subscription request (Super Admin)
const approveSubscriptionSchema = joi.object({
    adminNotes: joi.string().trim().max(500).optional().allow(null, '').messages({
        'string.max': 'Admin notes must not exceed 500 characters'
    })
});

// Reject subscription request (Super Admin)
const rejectSubscriptionSchema = joi.object({
    adminNotes: joi.string().trim().max(500).required().messages({
        'string.empty': 'Admin notes are required when rejecting a request',
        'string.max': 'Admin notes must not exceed 500 characters',
        'any.required': 'Please provide a reason for rejection'
    })
});

module.exports = {
    createSubscriptionRequestSchema,
    approveSubscriptionSchema,
    rejectSubscriptionSchema
};
