const Joi = require("joi");


const createSchoolSchema = Joi.object({
    name: Joi.string().trim().required(),
    slug: Joi.string().trim().optional(),
    address: Joi.string().trim().optional(),
    phone: Joi.string().trim().optional(),
    logo: Joi.string().trim().optional(),
    planId: Joi.string().trim().optional(),
});

const updateSchoolSchema = Joi.object({
    name: Joi.string().trim().optional(),
    slug: Joi.string().trim().optional(),
    address: Joi.string().trim().optional(),
    phone: Joi.string().trim().optional(),
    logo: Joi.string().trim().optional(),
    planId: Joi.string().trim().optional(),
});

module.exports = { createSchoolSchema, updateSchoolSchema };