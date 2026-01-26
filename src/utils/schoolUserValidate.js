const Joi = require('joi');

const addSchoolMemberSchema = Joi.object({
    firstName: Joi.string().trim().required().messages({
        'string.empty': 'First name is required',
        'any.required': 'First name is required'
    }),
    lastName: Joi.string().trim().required().messages({
        'string.empty': 'Last name is required',
        'any.required': 'Last name is required'
    }),
    email: Joi.string().trim().email().required().messages({
        'string.email': 'Please provide a valid email',
        'any.required': 'Email is required'
    }),
    password: Joi.string().trim().min(6).required().messages({
        'string.min': 'Password must be at least 6 characters long',
        'any.required': 'Password is required'
    }),
    phone: Joi.string().trim().allow(null, '').optional(),
    gender: Joi.string().trim().valid('MALE', 'FEMALE').required().messages({
        'any.only': 'Gender must be either MALE or FEMALE',
        'any.required': 'Gender is required'
    }),
    birthDate: Joi.date().required().messages({
        'date.base': 'Please provide a valid date for birthDate',
        'any.required': 'Birth date is required'
    }),
    className: Joi.string().trim().allow(null, '').optional(),
    role: Joi.string().trim().valid('TEACHER', 'ASSISTANT', 'STUDENT', 'ACCOUNTANT').required().messages({
        'any.only': 'Role must be one of [TEACHER, ASSISTANT, STUDENT, ACCOUNTANT]',
        'any.required': 'Role is required'
    }),
});

module.exports = {
    addSchoolMemberSchema
};
