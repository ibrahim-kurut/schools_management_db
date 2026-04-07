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
                studentProfile: true,
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

            // Calculate financial summary
            const tuitionFee = user.class?.tuitionFee || 0;
            const discount = user.studentProfile?.discountAmount || 0;
            const netRequired = tuitionFee - discount;
            const totalPaid = (user.paymentsMade || []).reduce((sum, p) => p.status === 'COMPLETED' ? sum + p.amount : sum, 0);
            const remainingBalance = netRequired - totalPaid;

            return {
                status: "SUCCESS",
                message: "Student profile retrieved",
                user: {
                    ...studentProfile,
                    financialSummary: {
                        totalTuitionFee: tuitionFee,
                        discountAmount: discount,
                        netRequired: netRequired,
                        totalPaid: totalPaid,
                        remainingBalance: remainingBalance
                    }
                }
            };
        } else if (user.role === 'TEACHER') {
            const { gradesAsStudent, paymentsMade, ...teacherProfile } = userData;

            // 1. Count grades entered by this teacher
            const gradesEnteredCount = await prisma.grade.count({
                where: { teacherId: userId }
            });

            // 2. Fetch latest grades entered for "Recent Activities"
            const latestGrades = await prisma.grade.findMany({
                where: { teacherId: userId },
                include: {
                    student: { select: { firstName: true, lastName: true } },
                    subject: { select: { name: true } }
                },
                orderBy: { createdAt: 'desc' },
                take: 5
            });

            // 3. Calculate attendance rate
            const attendanceRecords = user.attendanceRecords || [];
            const totalAttendance = attendanceRecords.length;
            const presentAttendance = attendanceRecords.filter(r => r.status === 'PRESENT').length;
            const attendanceRate = totalAttendance > 0 ? Math.round((presentAttendance / totalAttendance) * 100) : 100;

            return {
                status: "SUCCESS",
                message: "Teacher profile retrieved",
                user: {
                    ...teacherProfile,
                    stats: {
                        gradesEnteredCount,
                        attendanceRate,
                        latestSalary: user.salariesReceived?.[0]?.amount || 0
                    },
                    latestActivities: latestGrades.map(g => ({
                        id: g.id,
                        type: 'GRADE_ADDED',
                        message: `تم رصد درجة الطالب ${g.student.firstName} ${g.student.lastName} في مادة ${g.subject.name}`,
                        time: g.createdAt,
                        icon: '📝'
                    }))
                }
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
        // 1. Get the teacher's schoolId and the current academic year for that school
        const teacher = await prisma.user.findUnique({
            where: { id: teacherId },
            select: { schoolId: true }
        });

        if (!teacher || !teacher.schoolId) {
            throw { statusCode: 404, message: "Teacher or School not found" };
        }

        const currentYear = await prisma.academicYear.findFirst({
            where: {
                schoolId: teacher.schoolId,
                isCurrent: true
            },
            select: { id: true }
        });

        // 2. Find all classes where the teacher is teaching a subject
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
                    select: {
                        id: true, // Crucial fix: include subject ID
                        name: true
                    }
                }
            }
        });

        // 3. Attach academicYearId to each class for the frontend to use
        const enhancedClasses = teacherClasses.map(cls => ({
            ...cls,
            academicYearId: currentYear?.id || null
        }));

        return {
            status: "SUCCESS",
            message: "Teacher classes and students retrieved",
            classes: enhancedClasses
        };
    } catch (error) {
        throw error;
    }
};