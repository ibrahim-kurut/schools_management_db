const Joi = require('joi');

const createUserSchema = Joi.object({
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    phone: Joi.string().required(),
    gender: Joi.string().valid('MALE', 'FEMALE').required(),
    birthDate: Joi.date().required(),
});

const loginUserSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
});

module.exports = {
    createUserSchema,
    loginUserSchema,
};
