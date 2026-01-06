const Joi = require('joi');


const createPlanSchema = Joi.object({
    name: Joi.string().trim().required(),
    description: Joi.string().trim(),
    price: Joi.number().min(0).default(0),
    maxStudents: Joi.number().integer().min(0).default(50),
    maxTeachers: Joi.number().integer().min(0).default(10),
    storageLimit: Joi.number().integer().min(0).default(100),
    allowReports: Joi.boolean().default(false),
});

module.exports = {
    createPlanSchema,
};