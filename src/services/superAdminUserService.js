const prisma = require("../utils/prisma");
const { hashPassword } = require("../utils/auth");

/**
 * @description Get all users across the platform
 */
exports.getAllUsersService = async (page, limit, searchWord, roleFilter) => {
    const skip = (page - 1) * limit;

    const whereClause = {
        isDeleted: false,
    };

    if (searchWord && searchWord.trim() !== "") {
        whereClause.OR = [
            { firstName: { contains: searchWord, mode: 'insensitive' } },
            { lastName: { contains: searchWord, mode: 'insensitive' } },
            { email: { contains: searchWord, mode: 'insensitive' } }
        ];
    }

    if (roleFilter) {
        whereClause.role = roleFilter;
    } else {
        // Only show platform and school administrators in this view
        whereClause.role = { in: ['SUPER_ADMIN', 'SCHOOL_ADMIN'] };
    }

    const [users, totalUsers] = await Promise.all([
        prisma.user.findMany({
            where: whereClause,
            skip: skip,
            take: limit,
            orderBy: [
                { role: 'asc' },
                { createdAt: 'desc' }
            ],
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                role: true,
                image: true,
                createdAt: true,
                updatedAt: true,
                school: {
                    select: {
                        name: true
                    }
                },
                ownedSchool: {
                    select: {
                        name: true
                    }
                }
            }
        }),
        prisma.user.count({ where: whereClause })
    ]);

    // Consolidate school name for the frontend explicitly
    const formattedUsers = users.map(user => {
        const schoolName = user.ownedSchool?.name || user.school?.name || "—";
        
        return {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            role: user.role,
            image: user.image,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            schoolName: schoolName
        };
    });

    return { users: formattedUsers, totalUsers };
};

/**
 * @description Update user details and role
 */
exports.updateUserService = async (userId, updateData) => {
    const dataToUpdate = { ...updateData };
    
    // If password is provided, hash it
    if (dataToUpdate.password) {
        dataToUpdate.password = await hashPassword(dataToUpdate.password);
    }

    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: dataToUpdate,
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            school: { select: { name: true } },
            ownedSchool: { select: { name: true } }
        }
    });

    return {
        id: updatedUser.id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        image: updatedUser.image,
        schoolName: updatedUser.ownedSchool?.name || updatedUser.school?.name || "—"
    };
};

/**
 * @description Soft delete a user
 */
exports.deleteUserService = async (userId) => {
    const deletedUser = await prisma.user.update({
        where: { id: userId },
        data: { isDeleted: true, deletedAt: new Date() }
    });
    return deletedUser;
};
