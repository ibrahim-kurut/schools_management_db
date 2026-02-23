const prisma = require("../utils/prisma");

/**
 * @description create a expense
 * @access private (Accountant or School Admin)
 */

exports.createExpenseService = async (requester, expenseData) => {
    const { title, amount, date, type, recipientId } = expenseData;

    // 1. Recipient check (if provided or if type is SALARY)
    if (recipientId) {
        const user = await prisma.user.findUnique({
            where: {
                id: recipientId,
                schoolId: requester.schoolId,
            },
        });

        if (!user) {
            throw new Error("Recipient user not found in your school");
        }

        if (type === "SALARY") {
            // Optional: check if the user is a staff member (not a student)
            const staffRoles = ["TEACHER", "ACCOUNTANT", "ASSISTANT", "SCHOOL_ADMIN"];
            if (!staffRoles.includes(user.role)) {
                throw new Error("Salaries can only be paid to staff members");
            }
        }
    } else if (type === "SALARY") {
        throw new Error("Recipient is required for salary expenses");
    }

    // 2. Create the expense
    const expense = await prisma.expense.create({
        data: {
            title,
            amount: parseFloat(amount),
            date: date ? new Date(date) : new Date(), // Default to today
            type,
            schoolId: requester.schoolId,
            recipientId: recipientId || null,
            recordedById: requester.id,
        },
    });

    return expense;
};

/**
 * @description get all expenses with pagination
 * @access private (Accountant or School Admin)
 */
exports.getAllExpensesService = async (requester, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;

    const [expenses, total] = await Promise.all([
        prisma.expense.findMany({
            where: {
                schoolId: requester.schoolId,
            },
            skip: skip,
            take: parseInt(limit),
            orderBy: { date: 'desc' },
            select: {
                id: true,
                title: true,
                amount: true,
                date: true,
                type: true,
                recipientId: true,
                recordedById: true,

                recipient: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    }
                },
                recordedBy: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    }
                },
            },
        }),
        prisma.expense.count({
            where: { schoolId: requester.schoolId }
        })
    ]);

    return {
        expenses,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
        }
    };
};

/**
 * @description get expense by id
 * @access private (Accountant or School Admin)
 */
exports.getExpenseByIdService = async (requester, id) => {
    const expense = await prisma.expense.findUnique({
        where: {
            id,
            schoolId: requester.schoolId,
        },
        select: {
            id: true,
            title: true,
            amount: true,
            date: true,
            type: true,
            recipientId: true,
            recordedById: true,

            recipient: {
                select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                }
            },
            recordedBy: {
                select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                }
            },
        },
    });
    return expense;
};