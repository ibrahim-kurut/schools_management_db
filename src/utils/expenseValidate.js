const Joi = require("joi");

const createExpenseSchema = Joi.object({
    title: Joi.string().trim().min(3).required()
        .messages({
            'string.min': 'Title must be at least 3 characters long',
            'any.required': 'Title is required'
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

    type: Joi.string().valid("SALARY", "MAINTENANCE", "SUPPLIES", "RENT", "UTILITIES", "MARKETING", "OTHER").required()
        .messages({
            'any.only': 'Expense type must be one of: SALARY, MAINTENANCE, SUPPLIES, RENT, UTILITIES, MARKETING, OTHER',
            'any.required': 'Expense type is required'
        }),

    recipientId: Joi.string().uuid().optional()
        .messages({
            'string.guid': 'Recipient ID must be a valid UUID'
        })
});

const updateExpenseSchema = Joi.object({
    title: Joi.string().trim().min(3).optional()
        .messages({
            'string.min': 'Title must be at least 3 characters long'
        }),

    amount: Joi.number().positive().optional()
        .messages({
            'number.base': 'Amount must be a number',
            'number.positive': 'Amount must be a positive value'
        }),

    date: Joi.date().optional()
        .messages({
            'date.base': 'Date must be a valid date format'
        }),

    type: Joi.string().valid("SALARY", "MAINTENANCE", "SUPPLIES", "RENT", "UTILITIES", "MARKETING", "OTHER").optional()
        .messages({
            'any.only': 'Expense type must be one of: SALARY, MAINTENANCE, SUPPLIES, RENT, UTILITIES, MARKETING, OTHER'
        }),

    recipientId: Joi.string().uuid().optional().allow(null)
        .messages({
            'string.guid': 'Recipient ID must be a valid UUID'
        })
});

module.exports = {
    createExpenseSchema,
    updateExpenseSchema
};
