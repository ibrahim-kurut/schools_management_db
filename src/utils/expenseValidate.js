const Joi = require("joi");

const createExpenseSchema = Joi.object({
    title: Joi.string().trim().min(3).required()
        .messages({
            'string.base': 'عنوان المصروف يجب أن يكون نصاً',
            'string.empty': 'عنوان المصروف مطلوب',
            'string.min': 'يجب أن يكون عنوان المصروف 3 أحرف على الأقل',
            'any.required': 'عنوان المصروف حقل مطلوب'
        }),

    amount: Joi.number().positive().required()
        .messages({
            'number.base': 'المبلغ يجب أن يكون رقماً',
            'number.positive': 'يجب أن يكون المبلغ قيمة موجبة',
            'any.required': 'المبلغ حقل مطلوب'
        }),

    date: Joi.date().optional()
        .messages({
            'date.base': 'التاريخ المدخل غير صحيح'
        }),

    type: Joi.string().valid("SALARY", "MAINTENANCE", "SUPPLIES", "RENT", "UTILITIES", "MARKETING", "OTHER").required()
        .messages({
            'any.only': 'نوع المصروف غير صالح',
            'any.required': 'نوع المصروف حقل مطلوب'
        }),

    recipientId: Joi.string().uuid().allow(null, '').optional()
        .messages({
            'string.guid': 'معرف المستلم غير صحيح'
        }),

    recipientName: Joi.string().trim().max(100).allow(null, '').optional()
        .messages({
            'string.max': 'اسم المستلم طويل جداً (الحد الأقصى 100 حرف)'
        })
});

const updateExpenseSchema = Joi.object({
    title: Joi.string().trim().min(3).optional()
        .messages({
            'string.min': 'يجب أن يكون عنوان المصروف 3 أحرف على الأقل'
        }),

    amount: Joi.number().positive().optional()
        .messages({
            'number.base': 'المبلغ يجب أن يكون رقماً',
            'number.positive': 'يجب أن يكون المبلغ قيمة موجبة'
        }),

    date: Joi.date().optional()
        .messages({
            'date.base': 'التاريخ المدخل غير صحيح'
        }),

    type: Joi.string().valid("SALARY", "MAINTENANCE", "SUPPLIES", "RENT", "UTILITIES", "MARKETING", "OTHER").optional()
        .messages({
            'any.only': 'نوع المصروف غير صالح'
        }),

    recipientId: Joi.string().uuid().allow(null, '').optional()
        .messages({
            'string.guid': 'معرف المستلم غير صحيح'
        }),

    recipientName: Joi.string().trim().max(100).allow(null, '').optional()
        .messages({
            'string.max': 'اسم المستلم طويل جداً (الحد الأقصى 100 حرف)'
        })
});

module.exports = {
    createExpenseSchema,
    updateExpenseSchema
};
