const { createUserSchema, loginUserSchema } = require("../utils/authValidate");
const authService = require("../services/authService");
const asyncHandler = require("../utils/asyncHandler");

exports.createUser = asyncHandler(async (req, res) => {
    const { error, value } = createUserSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const user = await authService.registerUser(value);

    res.status(201).json({
        message: "User created successfully",
        user
    });
});

exports.login = asyncHandler(async (req, res) => {
    const { error, value } = loginUserSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }

    const { user, token } = await authService.loginUser(value.email, value.password);

    // hide password
    user.password = undefined;

    const userData = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        token,
    }

    res.status(200).json({ message: "Login successful", userData });
});

/**
 * @description login user by school slug
 * @route POST /api/auth/:slug/login
 * @method POST
 * @access private (assistant, teacher, accountant, school admin)
 */
exports.loginWithSchoolSlug = asyncHandler(async (req, res) => {
    const { slug } = req.params;

    const { error, value } = loginUserSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }

    const { user, token } = await authService.loginUserBySchoolSlug(
        slug,
        value.email,
        value.password
    );

    // hide password
    user.password = undefined;

    const userData = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
        token,
    };

    res.status(200).json({ message: "Login successful", userData });
});
