const prisma = require("../utils/prisma");
const { hashPassword } = require("../utils/auth");

/**
 * @description Add a new member to a school
 * @route POST /api/school-user/add-member
 * @method POST
 * @access private (school owner)
 */
exports.addMemberService = async (requesterId, memberData) => {
    try {
        // 1. Get School for the Requester (Owner) & Include Plan
        const school = await prisma.school.findUnique({
            where: { ownerId: requesterId },
            include: {
                subscription: {
                    include: { plan: true }
                }
            }
        });

        if (!school) {
            throw new Error("School not found for this user");
        }

        // 2. Check Subscription Status
        if (school.subscription.status !== "ACTIVE") {
            throw new Error("School plan is not active");
        }

        // 3. Check Plan Limits
        const memberRole = memberData.role;

        if (memberRole === 'STUDENT') {
            const currentStudentsCount = await prisma.user.count({
                where: { schoolId: school.id, role: 'STUDENT' }
            });
            if (currentStudentsCount >= school.subscription.plan.maxStudents) {
                throw new Error("Plan limit reached for Students. Upgrade your plan.");
            }
        } else if (memberRole === 'TEACHER' || memberRole === 'ASSISTANT') {
            const currentTeachersCount = await prisma.user.count({
                where: { schoolId: school.id, role: { in: ['TEACHER', 'ASSISTANT'] } }
            });
            if (currentTeachersCount >= school.subscription.plan.maxTeachers) {
                throw new Error("Plan limit reached for Teachers. Upgrade your plan.");
            }
        }

        // 4. Check if user email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: memberData.email }
        });

        if (existingUser) {
            throw new Error("User with this email already exists");
        }

        // 5. Hash Password & Create User
        const hashedPassword = await hashPassword(memberData.password);

        const newUser = await prisma.user.create({
            data: {
                firstName: memberData.firstName,
                lastName: memberData.lastName,
                email: memberData.email,
                password: hashedPassword,
                phone: memberData.phone,
                gender: memberData.gender,
                birthDate: new Date(memberData.birthDate),
                role: memberData.role,
                schoolId: school.id
            }
        });

        // Return user without sensitive data
        const { password, ...userWithoutPassword } = newUser;
        return userWithoutPassword;

    } catch (error) {
        throw error;
    }
};