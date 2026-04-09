const Joi = require('joi');

const createUserSchema = Joi.object({
    firstName: Joi.string().trim().required(),
    lastName: Joi.string().trim().required(),
    email: Joi.string().trim().email().required(),
    password: Joi.string().trim().min(6).required(),
    phone: Joi.string().trim().required(),
    gender: Joi.string().trim().valid('MALE', 'FEMALE').required(),
    birthDate: Joi.date().required(),
});

const loginUserSchema = Joi.object({
    // identifier can be email or studentCode
    email: Joi.string().trim().required().messages({
        "string.empty": "البريد الإلكتروني أو كود الطالب مطلوب",
    }),
    password: Joi.string().trim().required().messages({
        "string.empty": "كلمة المرور مطلوبة",
    }),
});


module.exports = {
    createUserSchema,
    loginUserSchema,
};
