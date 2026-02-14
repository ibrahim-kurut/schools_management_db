const prisma = require("../utils/prisma");

/**
 * @description Update student discount
 * @access private (Accountant or School Admin)
 */
exports.updateStudentDiscountService = async (requesterId, studentId, { discountAmount, discountNotes }) => {
    // 1. Verify requester permission (must be SCHOOL_ADMIN or ACCOUNTANT in the same school)
    const requester = await prisma.user.findUnique({
        where: { id: requesterId },
        select: { role: true, schoolId: true }
    });

    if (!requester || !["SCHOOL_ADMIN", "ACCOUNTANT"].includes(requester.role)) {
        throw new Error("Unauthorized to manage discounts");
    }

    // 2. Verify student belongs to the same school
    const student = await prisma.user.findUnique({
        where: { id: studentId },
        select: { schoolId: true, role: true }
    });

    if (!student || student.role !== "STUDENT" || student.schoolId !== requester.schoolId) {
        throw new Error("Student not found in your school");
    }

    // 3. Update or Create StudentProfile
    return await prisma.studentProfile.upsert({
        where: { userId: studentId },
        update: {
            discountAmount: parseFloat(discountAmount),
            discountNotes: discountNotes
        },
        create: {
            userId: studentId,
            discountAmount: parseFloat(discountAmount),
            discountNotes: discountNotes
        }
    });
};