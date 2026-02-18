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

/**
 * @description create a new payment
 * @access private (Accountant)
 */
exports.createPaymentService = async (requester, { studentId, amount, date, paymentType, status, note }) => {

    // 1. Verify student exists, is really a STUDENT, and belongs to the SAME school
    // optimization: select only necessary fields + school slug for invoice
    const student = await prisma.user.findFirst({
        where: {
            id: studentId,
            role: "STUDENT",
            schoolId: requester.schoolId
        },
        select: {
            id: true,
            school: {
                select: { slug: true } // Fetch slug for invoice prefix
            }
        }
    });

    if (!student) {
        throw new Error("Student not found or does not belong to your school");
    }

    // Helper to generate Invoice Number (e.g. SCH-123456)
    const generateInvoiceNumber = (prefix) => {
        return `${prefix.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;
    };

    // 2. Create Payment
    const payment = await prisma.payment.create({
        data: {
            studentId,
            schoolId: requester.schoolId,
            recordedById: requester.id,
            amount: parseFloat(amount),
            date: date ? new Date(date) : new Date(),
            paymentType,
            status: status || "COMPLETED",
            note,
            invoiceNumber: generateInvoiceNumber(student.school.slug.slice(0, 3)) // Use first 3 chars of slug
        }
    });

    // 3. Get Recorder Name
    const recorder = await prisma.user.findUnique({
        where: { id: requester.id },
        select: { firstName: true, lastName: true }
    });

    return {
        ...payment,
        recordedByName: recorder ? `${recorder.firstName} ${recorder.lastName}` : "Unknown"
    };
};

/**
 * @description Get student financial record summary
 * @access private (Accountant, School Admin, Student/Parent)
 */
exports.getStudentFinancialRecordService = async (requesterId, studentId) => {
    // 1. Fetch Requester info
    const requester = await prisma.user.findUnique({
        where: { id: requesterId },
        select: { id: true, schoolId: true, role: true }
    });

    if (!requester) throw new Error("Requester not found");

    // 2. Fetch Student with all necessary financial relations
    const student = await prisma.user.findUnique({
        where: { id: studentId },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            schoolId: true,
            class: {
                select: {
                    name: true,
                    tuitionFee: true
                }
            },
            studentProfile: {
                select: {
                    discountAmount: true,
                    discountNotes: true
                }
            },
            paymentsMade: {
                where: {
                    paymentType: "TUITION",
                    status: "COMPLETED"
                },
                select: {
                    id: true,
                    amount: true,
                    date: true,
                    invoiceNumber: true,
                    note: true
                },
                orderBy: { date: 'desc' }
            }
        }
    });

    if (!student || student.role !== "STUDENT") {
        throw new Error("Student not found");
    }

    // 3. Security Check
    // 3a. Same School Check
    if (student.schoolId !== requester.schoolId) {
        throw new Error("You do not have permission to view this student's record");
    }

    // 3b. Role-based Identity Check (Students can only see their own record)
    if (requester.role === "STUDENT" && requester.id !== studentId) {
        throw new Error("Access denied: You can only view your own financial record");
    }

    // 4. Calculations
    const classFee = student.class?.tuitionFee || 0;
    const discount = student.studentProfile?.discountAmount || 0;
    const netRequired = classFee - discount;

    const totalPaid = student.paymentsMade.reduce((sum, p) => sum + p.amount, 0);
    const balance = netRequired - totalPaid;

    return {
        studentName: `${student.firstName} ${student.lastName}`,
        className: student.class?.name || "Not Assigned",
        summary: {
            totalTuitionFee: classFee,
            discountAmount: discount,
            netRequired: netRequired,
            totalPaid: totalPaid,
            remainingBalance: balance
        },
        paymentHistory: student.paymentsMade
    };
};