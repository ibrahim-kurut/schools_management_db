const joi = require("joi");


const createSubjectSchema = joi.object({
    name: joi.string().trim().min(3).max(30).lowercase().required(),
    classId: joi.string().trim().uuid().guid({ version: ['uuidv4', 'uuidv5'] }).required(),
    teacherId: joi.string().trim().uuid().guid({ version: ['uuidv4', 'uuidv5'] }).optional(),
})

module.exports = createSubjectSchema;