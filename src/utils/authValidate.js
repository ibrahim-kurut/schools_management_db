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
    email: Joi.string().trim().email().required(),
    password: Joi.string().trim().required(),
});

module.exports = {
    createUserSchema,
    loginUserSchema,
};
