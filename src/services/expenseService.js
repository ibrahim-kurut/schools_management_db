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
 * @description get all expenses
 * @access private (Accountant or School Admin)
 */
exports.getAllExpensesService = async (requester) => {
    const expenses = await prisma.expense.findMany({
        where: {
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
    return expenses;
};