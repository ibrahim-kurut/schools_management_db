const prisma = require("../utils/prisma");
const { hashPassword, comparePassword, generateToken } = require("../utils/auth");

exports.registerUser = async (userData) => {
    return await prisma.$transaction(async (tx) => {
        // 1. Preventing more than one super admin
        if (userData.role === 'SUPER_ADMIN') {
            const existingSuperAdmin = await tx.user.findFirst({
                where: { role: 'SUPER_ADMIN' }
            });
            if (existingSuperAdmin) {
                throw new Error("A super admin already exists for the platform. You cannot add another.");
            }
        } else {
            // By default, any user who registers is a school admin
            userData.role = 'SCHOOL_ADMIN';
        }

        // 2. Encrypting the password
        userData.password = await hashPassword(userData.password);

        // 3. Creating the user
        const user = await tx.user.create({ data: userData });

        // 4. Returning user data (without password)
        return {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            role: user.role,
            createdAt: user.createdAt
        };
    });
};

exports.loginUser = async (email, password) => {
    const user = await prisma.user.findUnique({
        where: { email },
        include: { ownedSchool: true }
    });

    if (!user) {
        throw new Error("Invalid credentials");
    }

    // Only SUPER_ADMIN and SCHOOL_ADMIN can use this endpoint
    const allowedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN'];
    if (!allowedRoles.includes(user.role)) {
        throw new Error("Access denied. Please use school-specific login.");
    }

    const isMatch = await comparePassword(password, user.password);

    if (!isMatch) {
        throw new Error("Invalid credentials");
    }

    // get school id from token
    const schoolId = user.schoolId || (user.ownedSchool ? user.ownedSchool.id : null);

    const token = generateToken({
        id: user.id,
        role: user.role,
        schoolId: schoolId,
        author: user.firstName + " " + user.lastName
    });

    return { user, token };
};


/**
 * @description login user by school slug
 * @route POST /api/auth/:slug/login
 * @method POST
 * @access private (assistant, teacher, accountant, school admin)
 */
exports.loginUserBySchoolSlug = async (slug, email, password) => {
    // 1. Find school by slug
    const school = await prisma.school.findUnique({
        where: { slug }
    });

    if (!school) {
        throw new Error("School not found");
    }

    // 2. Find user by email within this school (member or owner)
    const user = await prisma.user.findFirst({
        where: {
            email,
            OR: [
                { schoolId: school.id },           // Member (teacher, student, assistant)
                { ownedSchool: { id: school.id } } // Owner (school admin)
            ]
        }
    });

    if (!user) {
        throw new Error("Invalid credentials");
    }

    // 3. Verify password
    const isMatch = await comparePassword(password, user.password);

    if (!isMatch) {
        throw new Error("Invalid credentials");
    }

    // 4. Generate token
    const token = generateToken({
        id: user.id,
        role: user.role,
        schoolId: school.id,
        author: user.firstName + " " + user.lastName
    });

    return { user, token };
};
