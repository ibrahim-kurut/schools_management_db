const prisma = require("../utils/prisma");

/**
 * @description Helper to validate expense recipient and role for Salaries
 */
const validateExpenseRecipient = async (schoolId, type, recipientId) => {
    if (recipientId) {
        const user = await prisma.user.findUnique({
            where: {
                id: recipientId,
                schoolId: schoolId,
            },
        });

        if (!user) {
            throw new Error("Recipient user not found in your school");
        }

        if (type === "SALARY") {
            const staffRoles = ["TEACHER", "ACCOUNTANT", "ASSISTANT", "SCHOOL_ADMIN"];
            if (!staffRoles.includes(user.role)) {
                throw new Error("Salaries can only be paid to staff members");
            }
        }
    } else if (type === "SALARY") {
        throw new Error("Recipient is required for salary expenses");
    }
};

/**
 * @description create a expense
 * @access private (Accountant or School Admin)
 */
exports.createExpenseService = async (requester, expenseData) => {
    const { title, amount, date, type, recipientId } = expenseData;

    // 1. Recipient check
    await validateExpenseRecipient(requester.schoolId, type, recipientId);

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
                isDeleted: false,
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
            where: {
                schoolId: requester.schoolId,
                isDeleted: false
            }
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
            isDeleted: false,
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

/**
 * @description update a expense
 * @access private (Accountant or School Admin)
 */
exports.updateExpenseService = async (requester, expenseId, updateData) => {
    // 1. Verify existence and ownership, and ensure it's not deleted
    const existingExpense = await prisma.expense.findUnique({
        where: { id: expenseId },
        select: { schoolId: true, type: true, recipientId: true, isDeleted: true }
    });

    if (!existingExpense || existingExpense.isDeleted) {
        throw new Error("Expense record not found");
    }

    if (existingExpense.schoolId !== requester.schoolId) {
        throw new Error("You do not have permission to update this expense");
    }

    // 2. Validate recipient if provided or required by type
    const finalType = updateData.type || existingExpense.type;
    const finalRecipientId = updateData.recipientId !== undefined ? updateData.recipientId : existingExpense.recipientId;

    await validateExpenseRecipient(requester.schoolId, finalType, finalRecipientId);

    // 3. Update the expense
    const { title, amount, date, type, recipientId } = updateData;

    return await prisma.expense.update({
        where: { id: expenseId },
        data: {
            title,
            amount: amount !== undefined ? parseFloat(amount) : undefined,
            date: date ? new Date(date) : undefined,
            type,
            recipientId: recipientId !== undefined ? recipientId : undefined,
        },
    });
};

/**
 * @description delete (soft) a expense
 * @access private (Accountant or School Admin)
 */
exports.deleteExpenseService = async (requester, expenseId) => {
    // 1. Verify existence and ownership
    const existingExpense = await prisma.expense.findUnique({
        where: { id: expenseId },
        select: { schoolId: true, isDeleted: true }
    });

    if (!existingExpense || existingExpense.isDeleted) {
        throw new Error("Expense record not found");
    }

    if (existingExpense.schoolId !== requester.schoolId) {
        throw new Error("You do not have permission to delete this expense");
    }

    // 2. Soft delete
    return await prisma.expense.update({
        where: { id: expenseId },
        data: {
            isDeleted: true
        }
    });
};