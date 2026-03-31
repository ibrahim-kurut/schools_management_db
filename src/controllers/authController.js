const { createUserSchema, loginUserSchema } = require("../utils/authValidate");
const authService = require("../services/authService");
const asyncHandler = require("../utils/asyncHandler");
const supabase = require("../config/supabaseClient");

const BUCKET = process.env.SUPABASE_BUCKET || 'assets';

exports.createUser = asyncHandler(async (req, res) => {
    // 1. Validate text fields (works with both JSON and multipart/form-data)
    const { error, value } = createUserSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    // 2. Create user in database
    const user = await authService.registerUser(value);

    // 3. Upload profile image if provided (optional)
    let imageUrl = null;
    if (req.file) {
        const { buffer, mimetype, originalname } = req.file;
        const extension = originalname.split('.').pop();
        const uniqueFileName = `users/${user.id}/${Date.now()}.${extension}`;

        const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(uniqueFileName, buffer, {
                contentType: mimetype,
                upsert: true,
            });

        if (uploadError) {
            // Image upload failed but user is created — return user with a warning
            console.error('Image upload failed during registration:', uploadError.message);
            return res.status(201).json({
                message: "User created successfully, but image upload failed.",
                warning: uploadError.message,
                user,
            });
        }

        // Get public URL and update user record
        const { data: publicUrlData } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(uniqueFileName);

        imageUrl = publicUrlData.publicUrl;

        // Update the user's image field in DB
        await authService.updateUserImage(user.id, imageUrl);
    }

    res.status(201).json({
        message: "User created successfully",
        user: { ...user, image: imageUrl },
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
        schoolSlug: user.ownedSchool ? user.ownedSchool.slug : (user.school ? user.school.slug : null),
        schoolId: user.ownedSchool ? user.ownedSchool.id : user.schoolId
    }

    // Set token in HttpOnly cookie
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

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
        schoolSlug: slug,
    };

    // Set token in HttpOnly cookie
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    res.status(200).json({ message: "Login successful", userData });
});

exports.logout = asyncHandler(async (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    });
    res.status(200).json({ message: "Logged out successfully" });
});
