const Joi = require("joi");

// exam types that can be entered manually only
const MANUAL_EXAM_TYPES = [
    'OCTOBER',
    'NOVEMBER',
    'DECEMBER',
    'MIDYEAR',
    'MARCH',
    'APRIL',
    'FINAL_EXAM',
    'SECOND_ROUND_EXAM'
];

// exam types that are calculated automatically - cannot be entered manually
const CALCULATED_EXAM_TYPES = [
    'FIRST_SEMESTER_AVG',
    'SECOND_SEMESTER_AVG',
    'ANNUAL_EFFORT',
    'FINAL_GRADE',
    'LAST_GRADE'
];

const createGradeSchema = Joi.object({
    studentId: Joi.string()
        .uuid()
        .required()
        .messages({
            'string.guid': 'Student ID must be a valid UUID',
            'any.required': 'Student ID is required'
        }),

    subjectId: Joi.string()
        .uuid()
        .required()
        .messages({
            'string.guid': 'Subject ID must be a valid UUID',
            'any.required': 'Subject ID is required'
        }),

    academicYearId: Joi.string()
        .uuid()
        .required()
        .messages({
            'string.guid': 'Academic Year ID must be a valid UUID',
            'any.required': 'Academic Year ID is required'
        }),

    examType: Joi.string()
        .valid(...MANUAL_EXAM_TYPES)
        .required()
        .messages({
            'any.only': `Exam type must be one of: ${MANUAL_EXAM_TYPES.join(', ')}`,
            'any.required': 'Exam type is required'
        }),

    score: Joi.number()
        .min(0)
        .max(100)
        .required()
        .messages({
            'number.min': 'Score must be at least 0',
            'number.max': 'Score must be at most 100',
            'any.required': 'Score is required'
        }),
});

const studentIdParamSchema = Joi.object({
    studentId: Joi.string()
        .uuid()
        .required()
        .messages({
            'string.guid': 'Student ID must be a valid UUID',
            'any.required': 'Student ID is required'
        })
});

const updateGradeSchema = Joi.object({
    score: Joi.number()
        .min(0)
        .max(100)
        .required()
        .messages({
            'number.min': 'Score must be at least 0',
            'number.max': 'Score must be at most 100',
            'any.required': 'Score is required'
        }),
});

module.exports = {
    createGradeSchema,
    updateGradeSchema,
    MANUAL_EXAM_TYPES,
    CALCULATED_EXAM_TYPES
};