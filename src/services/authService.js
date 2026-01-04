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
    });

    if (!user) {
        throw new Error("Invalid credentials");
    }

    const isMatch = await comparePassword(password, user.password);

    if (!isMatch) {
        throw new Error("Invalid credentials");
    }

    const token = generateToken({ id: user.id, role: user.role });

    return { user, token };
};
