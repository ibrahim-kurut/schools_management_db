const Joi = require("joi");

const contactMessageSchema = Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
        "string.empty": "اسم المسؤول مطلوب",
        "string.min": "اسم المسؤول يجب أن يكون حرفين على الأقل",
        "string.max": "اسم المسؤول يجب ألا يتجاوز 100 حرف",
        "any.required": "اسم المسؤول مطلوب",
    }),
    schoolName: Joi.string().min(2).max(200).required().messages({
        "string.empty": "اسم المدرسة مطلوب",
        "string.min": "اسم المدرسة يجب أن يكون حرفين على الأقل",
        "string.max": "اسم المدرسة يجب ألا يتجاوز 200 حرف",
        "any.required": "اسم المدرسة مطلوب",
    }),
    phone: Joi.string()
        .pattern(/^\d{11}$/)
        .required()
        .messages({
            "string.empty": "رقم الجوال مطلوب",
            "string.pattern.base": "رقم الجوال يجب أن يتكون من 11 رقماً",
            "any.required": "رقم الجوال مطلوب",
        }),
    email: Joi.string().email().required().messages({
        "string.empty": "البريد الإلكتروني مطلوب",
        "string.email": "صيغة البريد الإلكتروني غير صحيحة",
        "any.required": "البريد الإلكتروني مطلوب",
    }),
    studentCount: Joi.string()
        .valid("0-100", "100-500", "500-1000", "1000+")
        .required()
        .messages({
            "any.only": "يرجى اختيار حجم المؤسسة من الخيارات المتاحة",
            "any.required": "حجم المؤسسة مطلوب",
        }),
    message: Joi.string().max(500).allow("", null).messages({
        "string.max": "الرسالة يجب ألا تتجاوز 500 حرف",
    }),
});

module.exports = { contactMessageSchema };
