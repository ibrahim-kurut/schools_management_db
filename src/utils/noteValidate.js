const Joi = require('joi');

const validateNote = (data) => {
    const schema = Joi.object({
        content: Joi.string().min(5).max(1000).required().messages({
            'string.empty': 'محتوى الملاحظة لا يمكن أن يكون فارغاً',
            'string.min': 'يجب أن يكون محتوى الملاحظة 5 أحرف على الأقل',
            'string.max': 'يجب أن لا يتجاوز محتوى الملاحظة 1000 حرف',
            'any.required': 'محتوى الملاحظة مطلوب'
        }),
        classId: Joi.string().uuid().required().messages({
            'string.guid': 'معرف الصف غير صحيح',
            'any.required': 'معرف الصف مطلوب'
        })
    });

    return schema.validate(data);
};

module.exports = {
    validateNote
};
