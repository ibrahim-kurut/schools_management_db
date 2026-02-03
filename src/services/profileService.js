const prisma = require("../utils/prisma");


/**
 * @description Get user profile
 * @route GET /api/profile
 * @method GET
 * @access private
 */
exports.getUserProfileService = async (userId) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                school: true,
                class: true,
                // for student
                gradesAsStudent: { include: { subject: true } },
                paymentsMade: true,
                // for teacher
                salariesReceived: true,
                // for all
                attendanceRecords: true,
            },
        });

        // check if user exists
        if (!user) {
            return {
                status: "ERROR",
                message: "User not found",
            };
        }

        // check if user is deleted
        if (user.isDeleted) {
            return {
                status: "ERROR",
                message: "User account has been deleted",
            };
        }

        // if user is student
        if (user.role === 'STUDENT') {
            const { password, salariesReceived, ...studentData } = user;
            return {
                status: "SUCCESS",
                message: "Student profile retrieved",
                user: studentData
            };
        }
        // if user is teacher
        else if (user.role === 'TEACHER' || user.role === 'ASSISTANT' || user.role === 'ACCOUNTANT' || user.role === 'SUPER_ADMIN') {
            const { password, gradesAsStudent, paymentsMade, ...teacherData } = user;
            return {
                status: "SUCCESS",
                message: "Teacher profile retrieved",
                user: teacherData
            };
        } else {
            // SCHOOL_ADMIN, SUPER_ADMIN
            const { password, salariesReceived, ...adminData } = user;
            return {
                status: "SUCCESS",
                message: "User profile retrieved",
                user: adminData
            };
        }
    } catch (error) {
        return {
            status: "ERROR",
            message: "Failed to retrieve user profile",
            error: error.message
        };
    }
};