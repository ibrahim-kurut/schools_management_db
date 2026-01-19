const Joi = require('joi');

// Schema for creating a new class
const createClassSchema = Joi.object({
    name: Joi.string().trim().min(3).max(100).required().messages({
        'string.empty': 'Class name required',
        'string.min': 'Class name must be at least 3 characters',
        'string.max': 'Class name must not exceed 100 characters',
        'any.required': 'Class name required'
    }),

    tuitionFee: Joi.number().min(0).default(0).messages({
        'number.base': 'Tuition fee must be a number',
        'number.min': 'Tuition fee must not be negative'
    })
});

// Schema for updating a class
const updateClassSchema = Joi.object({
    name: Joi.string().trim().min(3).max(100).messages({
        'string.empty': 'Class name required',
        'string.min': 'Class name must be at least 3 characters',
        'string.max': 'Class name must not exceed 100 characters'
    }),

    tuitionFee: Joi.number().min(0).messages({
        'number.base': 'Tuition fee must be a number',
        'number.min': 'Tuition fee must not be negative'
    })
}).min(1).messages({
    'object.min': 'At least one field must be provided for update'
});

module.exports = {
    createClassSchema,
    updateClassSchema
};
