const Joi = require('joi');

const createPlanSchema = Joi.object({
    name: Joi.string().trim().required().messages({
        'string.empty': 'اسم الخطة مطلوب ولا يمكن أن يكون فارغاً',
        'any.required': 'اسم الخطة حقل إلزامي'
    }),
    description: Joi.string().trim().allow('').messages({
        'string.base': 'الوصف يجب أن يكون نصاً'
    }),
    price: Joi.number().min(0).default(0).messages({
        'number.min': 'السعر لا يمكن أن يكون أقل من 0',
        'number.base': 'السعر يجب أن يكون رقماً'
    }),
    maxStudents: Joi.number().integer().min(0).default(50).messages({
        'number.min': 'سعة الطلاب لا يمكن أن تكون أقل من 0',
        'number.integer': 'سعة الطلاب يجب أن تكون رقماً صحيحاً'
    }),
    bufferStudents: Joi.number().integer().min(0).default(10).messages({
        'number.min': 'سعة الهدية (Buffer) لا يمكن أن تكون أقل من 0',
        'number.integer': 'سعة الهدية يجب أن تكون رقماً صحيحاً'
    }),
    pricePerExtraStudent: Joi.number().min(0).default(9).messages({
        'number.min': 'سعر الطالب الإضافي لا يمكن أن يكون أقل من 0'
    }),
    maxTeachers: Joi.number().integer().min(0).default(10).messages({
        'number.min': 'سعة المعلمين لا يمكن أن تكون أقل من 0'
    }),
    storageLimit: Joi.number().integer().min(0).default(100).messages({
        'number.min': 'مساحة التخزين لا يمكن أن تكون أقل من 0'
    }),
    durationInDays: Joi.number().integer().min(1).default(365).messages({
        'number.min': 'مدة الاشتراك يجب أن تكون يوماً واحداً على الأقل'
    }),
    allowReports: Joi.boolean().default(false).messages({
        'boolean.base': 'يجب تحديد خيار التقارير بشكل صحيح'
    }),
    supportLevel: Joi.string().default('EMAIL'),
    hasBasicManagement: Joi.boolean().default(true),
    hasAttendance: Joi.boolean().default(true),
    hasSchedules: Joi.boolean().default(false),
    hasExcelUpload: Joi.boolean().default(false),
    hasFinancials: Joi.boolean().default(false),
    hasBusSystem: Joi.boolean().default(false),
    hasMobileApp: Joi.boolean().default(false),
    hasAiReports: Joi.boolean().default(false),
}).messages({
    'object.unknown': 'الحقل "{#label}" غير مسموح به في بيانات الخطة'
});

const updatePlanSchema = Joi.object({
    name: Joi.string().trim().messages({
        'string.empty': 'اسم الخطة لا يمكن أن يكون فارغاً'
    }),
    description: Joi.string().trim().allow(''),
    price: Joi.number().min(0),
    maxStudents: Joi.number().integer().min(0),
    bufferStudents: Joi.number().integer().min(0),
    pricePerExtraStudent: Joi.number().min(0),
    maxTeachers: Joi.number().integer().min(0),
    storageLimit: Joi.number().integer().min(0),
    durationInDays: Joi.number().integer().min(1),
    allowReports: Joi.boolean(),
    supportLevel: Joi.string(),
    hasBasicManagement: Joi.boolean(),
    hasAttendance: Joi.boolean(),
    hasSchedules: Joi.boolean(),
    hasExcelUpload: Joi.boolean(),
    hasFinancials: Joi.boolean(),
    hasBusSystem: Joi.boolean(),
    hasMobileApp: Joi.boolean(),
    hasAiReports: Joi.boolean(),
}).messages({
    'object.unknown': 'الحقل "{#label}" غير مسموح به في بيانات الخطة'
});

module.exports = {
    createPlanSchema,
    updatePlanSchema,
};