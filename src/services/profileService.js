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
                subjects: {
                    include: {
                        class: {
                            select: { id: true, name: true }
                        }
                    }
                },
                // for all
                attendanceRecords: {
                    take: 10, // Just a sample for performance
                    orderBy: { date: 'desc' }
                },
            },
        });

        // check if user exists
        if (!user) {
            throw { statusCode: 404, message: "User not found" };
        }

        // check if user is deleted
        if (user.isDeleted) {
            throw { statusCode: 403, message: "User account has been deleted" };
        }

        const { password, ...userData } = user;

        // Role-based data filtering
        if (user.role === 'STUDENT') {
            const { salariesReceived, subjects, ...studentProfile } = userData;
            return {
                status: "SUCCESS",
                message: "Student profile retrieved",
                user: studentProfile
            };
        } else if (user.role === 'TEACHER') {
            const { gradesAsStudent, paymentsMade, ...teacherProfile } = userData;
            return {
                status: "SUCCESS",
                message: "Teacher profile retrieved",
                user: teacherProfile
            };
        } else {
            // Admin, Assistant, Accountant, etc.
            const { gradesAsStudent, paymentsMade, ...adminProfile } = userData;
            return {
                status: "SUCCESS",
                message: "User profile retrieved",
                user: adminProfile
            };
        }
    } catch (error) {
        throw error;
    }
};



/**
 * @description Get classes and students for a teacher
 * @param {string} teacherId
 * @returns {Promise<Array>} List of classes with their students
 */
exports.getTeacherStudentsService = async (teacherId) => {
    try {
        // 1. Find all classes where the teacher is teaching a subject
        const teacherClasses = await prisma.class.findMany({
            where: {
                subjects: {
                    some: {
                        teacherId: teacherId
                    }
                }
            },
            include: {
                students: {
                    where: { isDeleted: false },
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        gender: true,
                        phone: true
                    }
                },
                subjects: {
                    where: { teacherId: teacherId },
                    select: { name: true }
                }
            }
        });

        return {
            status: "SUCCESS",
            message: "Teacher classes and students retrieved",
            classes: teacherClasses
        };
    } catch (error) {
        throw error;
    }
};