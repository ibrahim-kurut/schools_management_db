const Joi = require("joi");

const createPaymentSchema = Joi.object({
    studentId: Joi.string().uuid().required()
        .messages({
            'string.guid': 'Student ID must be a valid UUID',
            'any.required': 'Student ID is required'
        }),

    amount: Joi.number().positive().required()
        .messages({
            'number.base': 'Amount must be a number',
            'number.positive': 'Amount must be a positive value',
            'any.required': 'Amount is required'
        }),

    date: Joi.date().optional()
        .messages({
            'date.base': 'Date must be a valid date format'
        }),

    paymentType: Joi.string().valid("TUITION", "TRANSPORT", "BOOKS", "UNIFORM", "ACTIVITIES", "OTHER").required()
        .messages({
            'any.only': 'Payment type must be one of: TUITION, TRANSPORT, BOOKS, UNIFORM, ACTIVITIES, OTHER',
            'any.required': 'Payment type is required'
        }),

    status: Joi.string().valid("PENDING", "COMPLETED").optional()
        .messages({
            'any.only': 'Status must be either PENDING or COMPLETED'
        }),

    note: Joi.string().trim().optional()
});

const updatePaymentSchema = Joi.object({
    amount: Joi.number().positive().optional()
        .messages({
            'number.base': 'Amount must be a number',
            'number.positive': 'Amount must be a positive value'
        }),

    date: Joi.date().optional()
        .messages({
            'date.base': 'Date must be a valid date format'
        }),

    paymentType: Joi.string().valid("TUITION", "TRANSPORT", "BOOKS", "UNIFORM", "ACTIVITIES", "OTHER").optional()
        .messages({
            'any.only': 'Payment type must be one of: TUITION, TRANSPORT, BOOKS, UNIFORM, ACTIVITIES, OTHER'
        }),

    status: Joi.string().valid("PENDING", "COMPLETED", "CANCELLED").optional()
        .messages({
            'any.only': 'Status must be one of: PENDING, COMPLETED, CANCELLED'
        }),

    note: Joi.string().trim().optional()
});

module.exports = {
    createPaymentSchema,
    updatePaymentSchema
};