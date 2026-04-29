const Joi = require('joi');

const createUserSchema = Joi.object({
    firstName: Joi.string().trim().required().messages({
        'string.empty': 'الاسم الأول مطلوب',
        'any.required': 'الاسم الأول حقل إلزامي'
    }),
    lastName: Joi.string().trim().required().messages({
        'string.empty': 'الاسم الأخير مطلوب',
        'any.required': 'الاسم الأخير حقل إلزامي'
    }),
    email: Joi.string().trim().email().required().messages({
        'string.empty': 'البريد الإلكتروني مطلوب',
        'string.email': 'يرجى إدخال بريد إلكتروني صالح',
        'any.required': 'البريد الإلكتروني حقل إلزامي'
    }),
    password: Joi.string().trim().min(8).pattern(/[a-zA-Z]/).pattern(/[0-9]/).required().messages({
        'string.empty': 'كلمة المرور مطلوبة',
        'string.min': 'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
        'string.pattern.base': 'يجب أن تحتوي كلمة المرور على حروف وأرقام',
        'any.required': 'كلمة المرور حقل إلزامي'
    }),
    phone: Joi.string().trim().pattern(/^\d{10,11}$/).required().messages({
        'string.empty': 'رقم الهاتف مطلوب',
        'string.pattern.base': 'يجب أن يكون رقم الهاتف 10 أو 11 رقماً',
        'any.required': 'رقم الهاتف حقل إلزامي'
    }),
    gender: Joi.string().trim().valid('MALE', 'FEMALE').required().messages({
        'any.only': 'يجب اختيار الجنس (ذكر أو أنثى)',
        'any.required': 'الجنس حقل إلزامي'
    }),
    birthDate: Joi.date().required().messages({
        'date.base': 'يرجى إدخال تاريخ ميلاد صالح',
        'any.required': 'تاريخ الميلاد حقل إلزامي'
    }),
}).messages({
    'object.unknown': 'الحقل "{#label}" غير مسموح به'
});

const loginUserSchema = Joi.object({
    email: Joi.string().trim().required().messages({
        "string.empty": "البريد الإلكتروني أو كود الطالب مطلوب",
        "any.required": "البريد الإلكتروني أو كود الطالب مطلوب",
    }),
    password: Joi.string().trim().required().messages({
        "string.empty": "كلمة المرور مطلوبة",
        "any.required": "كلمة المرور مطلوبة",
    }),
}).messages({
    'object.unknown': 'الحقل "{#label}" غير مسموح به'
});


module.exports = {
    createUserSchema,
    loginUserSchema,
};
