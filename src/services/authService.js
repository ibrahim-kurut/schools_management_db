const prisma = require("../utils/prisma");
const { hashPassword, comparePassword, generateToken } = require("../utils/auth");

exports.registerUser = async (userData) => {
    return await prisma.$transaction(async (tx) => {
        // 0. Check if email already exists
        const existingUser = await tx.user.findUnique({
            where: { email: userData.email }
        });
        if (existingUser) {
            throw new Error("هذا البريد الإلكتروني مسجل بالفعل");
        }

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

/**
 * @description Update user image URL after Supabase upload
 */
exports.updateUserImage = async (userId, imageUrl) => {
    return await prisma.user.update({
        where: { id: userId },
        data: { image: imageUrl },
    });
};

exports.loginUser = async (email, password) => {
    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            ownedSchool: true,
            school: true
        }
    });

    if (!user) {
        const error = new Error("البيانات المدخلة غير صحيحة");
        error.statusCode = 401;
        throw error;
    }

    // Only SUPER_ADMIN and SCHOOL_ADMIN can use this endpoint
    const allowedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN'];
    if (!allowedRoles.includes(user.role)) {
        const error = new Error("عذراً، هذا تسجيل الدخول مخصص لإدارة المنصة والمدارس فقط.");
        error.statusCode = 403;
        throw error;
    }

    const isMatch = await comparePassword(password, user.password);

    if (!isMatch) {
        const error = new Error("البيانات المدخلة غير صحيحة");
        error.statusCode = 401;
        throw error;
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
exports.loginUserBySchoolSlug = async (slug, identifier, password) => {
    // identifier can be email or studentCode
    
    // 1. Find school by slug
    const school = await prisma.school.findUnique({
        where: { slug }
    });

    if (!school) {
        const error = new Error("لم يتم العثور على المدرسة");
        error.statusCode = 404;
        throw error;
    }

    // 2. Determine search criteria
    const isEmail = identifier.includes('@');
    
    // 3. Find user by identifier within this school (member or owner)
    const user = await prisma.user.findFirst({
        where: {
            ...(isEmail ? { email: identifier } : { studentCode: identifier }),
            OR: [
                { schoolId: school.id },           // Member (teacher, student, assistant)
                { ownedSchool: { id: school.id } } // Owner (school admin)
            ]
        },
        include: {
            ownedSchool: true,
            school: true
        }
    });

    if (!user) {
        const error = new Error("البيانات المدخلة غير صحيحة");
        error.statusCode = 401;
        throw error;
    }

    // 4. Verify password
    const isMatch = await comparePassword(password, user.password);

    if (!isMatch) {
        const error = new Error("البيانات المدخلة غير صحيحة");
        error.statusCode = 401;
        throw error;
    }

    // 5. Generate token
    const token = generateToken({
        id: user.id,
        role: user.role,
        schoolId: school.id,
        author: user.firstName + " " + user.lastName
    });

    return { user, token };
};

