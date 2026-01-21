const Joi = require('joi');

// Schema to check the ID
const validateIdSchema = Joi.object({
    id: Joi.string()
        .guid({ version: ['uuidv4', 'uuidv5'] })
        .required()
        .messages({
            "any.required": "ID is required",
            "string.guid": "Invalid ID format",
            "string.empty": "ID must not be empty"
        })
});

// ID verification function
const validateId = (id) => {
    return validateIdSchema.validate({ id });
};

module.exports = { validateId };