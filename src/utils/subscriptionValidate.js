const joi = require("joi");

// Create subscription request (School Admin)
const createSubscriptionRequestSchema = joi.object({
    planId: joi.string().uuid().required().messages({
        'string.empty': 'معرف الخطة مطلوب',
        'string.uuid': 'يجب أن يكون معرف الخطة صالحاً (UUID)',
        'any.required': 'معرف الخطة حقل إلزامي'
    }),
    paymentReceipt: joi.string().optional().allow(null, '').messages({
        'string.uri': 'يجب أن يكون رابط إيصال الدفع صالحاً'
    })
}).messages({
    'object.unknown': 'الحقل "{#label}" غير مسموح به في طلب الاشتراك'
});

// Approve subscription request (Super Admin)
const approveSubscriptionSchema = joi.object({
    adminNotes: joi.string().trim().max(500).optional().allow(null, '').messages({
        'string.max': 'ملاحظات المدير يجب ألا تتجاوز 500 حرف'
    })
}).messages({
    'object.unknown': 'الحقل "{#label}" غير مسموح به'
});

// Reject subscription request (Super Admin)
const rejectSubscriptionSchema = joi.object({
    adminNotes: joi.string().trim().max(500).required().messages({
        'string.empty': 'ملاحظات المدير مطلوبة عند رفض الطلب',
        'string.max': 'ملاحظات المدير يجب ألا تتجاوز 500 حرف',
        'any.required': 'يرجى توضيح سبب الرفض'
    })
}).messages({
    'object.unknown': 'الحقل "{#label}" غير مسموح به'
});

module.exports = {
    createSubscriptionRequestSchema,
    approveSubscriptionSchema,
    rejectSubscriptionSchema
};
