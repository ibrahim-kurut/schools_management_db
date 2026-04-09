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
    email: Joi.string().trim().email().when('role', {
        is: 'STUDENT',
        then: Joi.optional(),
        otherwise: Joi.required()
    }).messages({
        'string.email': 'يرجى إدخال بريد إلكتروني صحيح',
        'any.required': 'البريد الإلكتروني مطلوب'
    }),
    password: Joi.string().trim().min(6).when('role', {
        is: 'STUDENT',
        then: Joi.optional(),
        otherwise: Joi.required()
    }).messages({
        'string.min': 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
        'any.required': 'كلمة المرور مطلوبة'
    }),
    studentCode: Joi.string().trim().when('role', {
        is: 'STUDENT',
        then: Joi.required(),
        otherwise: Joi.optional()
    }).messages({
        'any.required': 'كود الطالب مطلوب'
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
    subject: Joi.string().trim().allow(null, '').optional(),
    discountAmount: Joi.number().min(0).optional(),
    customTuitionFee: Joi.number().min(0).allow(null, '').optional(),
    discountNotes: Joi.string().trim().allow(null, '').optional(),
    motherName: Joi.string().trim().when('role', {
        is: 'STUDENT',
        then: Joi.required(),
        otherwise: Joi.optional()
    }).messages({
        'any.required': 'Mother name is required for students'
    }),
    guardianMaritalStatus: Joi.string().trim().allow(null, '').optional(),
    role: Joi.string().trim().valid('TEACHER', 'ASSISTANT', 'STUDENT', 'ACCOUNTANT').required().messages({
        'any.only': 'Role must be one of [TEACHER, ASSISTANT, STUDENT, ACCOUNTANT]',
        'any.required': 'Role is required'
    }),
});

const updateSchoolMemberSchema = Joi.object({
    firstName: Joi.string().trim().empty('').optional(),
    lastName: Joi.string().trim().empty('').optional(),
    email: Joi.string().trim().email().empty('').optional(),
    password: Joi.string().trim().min(6).empty('').optional(),
    phone: Joi.string().trim().empty('').optional(),
    gender: Joi.string().trim().valid('MALE', 'FEMALE').empty('').optional(),
    birthDate: Joi.date().empty('').optional(),
    className: Joi.string().trim().empty('').optional(),
    subject: Joi.string().trim().empty('').optional(),
    discountAmount: Joi.number().min(0).optional(),
    customTuitionFee: Joi.number().min(0).allow(null, '').optional(),
    discountNotes: Joi.string().trim().empty('').optional(),
    motherName: Joi.string().trim().empty('').optional(),
    guardianMaritalStatus: Joi.string().trim().empty('').optional(),
    role: Joi.string().trim().valid('TEACHER', 'ASSISTANT', 'STUDENT', 'ACCOUNTANT').empty('').optional(),
});

module.exports = {
    addSchoolMemberSchema,
    updateSchoolMemberSchema
};
