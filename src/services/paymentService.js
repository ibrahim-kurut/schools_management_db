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
 * @description Get all students with their financial summary (fees, paid, balance)
 * @access private (Accountant, School Admin)
 */
exports.getStudentsFeesSummaryService = async (requester, { page, limit, search, classFilter }) => {
    const skip = (page - 1) * limit;

    // 1. Build where clause
    const whereClause = {
        schoolId: requester.schoolId,
        role: "STUDENT",
        isDeleted: false,
    };

    if (search && search.trim() !== "") {
        whereClause.OR = [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } }
        ];
    }

    if (classFilter && classFilter !== "ALL") {
        whereClause.class = { name: classFilter };
    }

    // 2. Fetch Total Count for Pagination
    const totalStudents = await prisma.user.count({ where: whereClause });

    // 3. Fetch Students with relations
    const students = await prisma.user.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { firstName: 'asc' },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            class: {
                select: {
                    name: true,
                    tuitionFee: true
                }
            },
            studentProfile: {
                select: {
                    discountAmount: true,
                    customTuitionFee: true
                }
            },
            paymentsMade: {
                where: {
                    paymentType: "TUITION",
                    status: "COMPLETED"
                },
                select: {
                    amount: true
                }
            }
        }
    });

    // 4. Calculate Summaries
    const formattedStudents = students.map(student => {
        const customFee = student.studentProfile?.customTuitionFee;
        const baseFee = customFee !== null ? customFee : (student.class?.tuitionFee || 0);
        const discount = student.studentProfile?.discountAmount || 0;
        const totalFees = baseFee - discount;
        const paid = student.paymentsMade.reduce((sum, p) => sum + p.amount, 0);
        const balance = totalFees - paid;

        let status = "PENDING";
        if (paid > 0) {
            status = balance <= 0 ? "COMPLETED" : "PARTIAL";
        }

        return {
            id: student.id,
            name: `${student.firstName} ${student.lastName}`,
            className: student.class?.name || "Not Assigned",
            totalFees,
            paid,
            balance,
            status
        };
    });

    return {
        students: formattedStudents,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalStudents / limit),
            totalStudents,
            itemsPerPage: limit
        }
    };
};

/**
 * @description create a new payment
 * @access private (Accountant)
 */
exports.createPaymentService = async (requester, { studentId, amount, date, paymentType, status, note }) => {

    // 1. Verify student exists, is really a STUDENT, and belongs to the SAME school
    // Fetch financial data needed for balance validation
    const student = await prisma.user.findFirst({
        where: {
            id: studentId,
            role: "STUDENT",
            schoolId: requester.schoolId
        },
        select: {
            id: true,
            school: {
                select: { slug: true }
            },
            class: {
                select: { tuitionFee: true }
            },
            studentProfile: {
                select: {
                    discountAmount: true,
                    customTuitionFee: true
                }
            },
            paymentsMade: {
                where: {
                    paymentType: "TUITION",
                    status: "COMPLETED"
                },
                select: { amount: true }
            }
        }
    });

    if (!student) {
        throw new Error("Student not found or does not belong to your school");
    }

    const parsedAmount = parseFloat(amount);

    // 2. Validate: payment amount must not exceed remaining balance (TUITION only)
    if (paymentType === "TUITION") {
        const customFee = student.studentProfile?.customTuitionFee;
        const baseFee = customFee !== null && customFee !== undefined ? customFee : (student.class?.tuitionFee || 0);
        const discount = student.studentProfile?.discountAmount || 0;
        const netRequired = baseFee - discount;
        const totalPaid = student.paymentsMade.reduce((sum, p) => sum + p.amount, 0);
        const remainingBalance = netRequired - totalPaid;

        if (parsedAmount > remainingBalance) {
            throw new Error(
                `لا يمكن تسجيل دفعة بقيمة ${parsedAmount.toLocaleString()} د.ع لأنها تتجاوز المبلغ المتبقي على الطالب وهو ${Math.max(0, remainingBalance).toLocaleString()} د.ع`
            );
        }

        if (remainingBalance <= 0) {
            throw new Error("لا يوجد رصيد متبقي على هذا الطالب، تم تسديد كامل الأقساط الدراسية");
        }
    }

    // Helper to generate Invoice Number (e.g. SCH-123456)
    const generateInvoiceNumber = (prefix) => {
        return `${prefix.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;
    };

    // 3. Create Payment
    const payment = await prisma.payment.create({
        data: {
            studentId,
            schoolId: requester.schoolId,
            recordedById: requester.id,
            amount: parsedAmount,
            date: date ? new Date(date) : new Date(),
            paymentType,
            status: status || "COMPLETED",
            note,
            invoiceNumber: generateInvoiceNumber(student.school.slug.slice(0, 3))
        }
    });

    // 4. Get Recorder Name
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
                    discountNotes: true,
                    customTuitionFee: true
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
    const customFee = student.studentProfile?.customTuitionFee;
    const baseFee = customFee !== null ? customFee : (student.class?.tuitionFee || 0);
    const discount = student.studentProfile?.discountAmount || 0;
    const netRequired = baseFee - discount;

    const totalPaid = student.paymentsMade.reduce((sum, p) => sum + p.amount, 0);
    const balance = netRequired - totalPaid;

    return {
        studentName: `${student.firstName} ${student.lastName}`,
        className: student.class?.name || "Not Assigned",
        summary: {
            totalTuitionFee: baseFee,
            discountAmount: discount,
            netRequired: netRequired,
            totalPaid: totalPaid,
            remainingBalance: balance
        },
        paymentHistory: student.paymentsMade
    };
};

/**
 * @description Update an existing payment
 * @access private (Accountant, School Admin)
 */
exports.updatePaymentService = async (requester, paymentId, updateData) => {
    // 1. Find payment and verify schoolId
    const existingPayment = await prisma.payment.findUnique({
        where: { id: paymentId },
        select: { schoolId: true, status: true }
    });

    if (!existingPayment) {
        throw new Error("Payment record not found");
    }

    if (existingPayment.schoolId !== requester.schoolId) {
        throw new Error("You do not have permission to update this payment");
    }

    if (existingPayment.status === "CANCELLED") {
        throw new Error("Cannot update a cancelled payment");
    }

    // 2. Perform Update
    const { amount, date, paymentType, note, status } = updateData;

    return await prisma.payment.update({
        where: { id: paymentId },
        data: {
            amount: amount !== undefined ? parseFloat(amount) : undefined,
            date: date ? new Date(date) : undefined,
            paymentType,
            status,
            note
        }
    });
};