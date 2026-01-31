const Joi = require("joi");

const createAcademicYearSchema = Joi.object({
    name: Joi.string().trim().required().messages({
        'string.empty': 'Academic year name is required',
        'any.required': 'Academic year name is required'
    }),
    startDate: Joi.date().required().messages({
        'date.base': 'Please provide a valid date for startDate',
        'any.required': 'Start date is required'
    }),
    endDate: Joi.date().greater(Joi.ref('startDate')).required().messages({
        'date.base': 'Please provide a valid date for endDate',
        'date.greater': 'End date must be after start date',
        'any.required': 'End date is required'
    }),
    isCurrent: Joi.boolean().default(false),
});

module.exports = { createAcademicYearSchema };