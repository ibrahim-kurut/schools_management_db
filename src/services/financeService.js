const prisma = require("../utils/prisma");
const { validateId } = require("../utils/validateUUID");
const XLSX = require("xlsx");

const toNumber = (value) => (value ? Number(value) : 0);
const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

const assertSchoolAccess = async (requester, schoolId) => {
    const { error } = validateId(schoolId);
    if (error) {
        const err = new Error("Invalid schoolId format");
        err.statusCode = 400;
        throw err;
    }

    if (requester.role !== "SUPER_ADMIN" && requester.schoolId !== schoolId) {
        const err = new Error("You do not have permission to access this school's finance stats");
        err.statusCode = 403;
        throw err;
    }

    const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { id: true, name: true, isDeleted: true }
    });

    if (!school || school.isDeleted) {
        const err = new Error("School not found");
        err.statusCode = 404;
        throw err;
    }

    return school;
};

const getMonthRange = (month) => {
    const now = new Date();
    const selectedMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    if (!MONTH_REGEX.test(selectedMonth)) {
        const err = new Error("Invalid month format. Use YYYY-MM");
        err.statusCode = 400;
        throw err;
    }

    const [year, m] = selectedMonth.split("-").map(Number);
    const startDate = new Date(Date.UTC(year, m - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, m, 1, 0, 0, 0, 0));

    return { selectedMonth, startDate, endDate };
};

exports.getFinanceStatsService = async (requester, schoolId) => {
    const school = await assertSchoolAccess(requester, schoolId);

    const [paymentsAgg, expensesAgg, studentCountsByClass] = await Promise.all([
        prisma.payment.aggregate({
            where: { schoolId },
            _sum: { amount: true }
        }),
        prisma.expense.aggregate({
            where: { schoolId, isDeleted: false },
            _sum: { amount: true }
        }),
        prisma.user.groupBy({
            by: ["classId"],
            where: {
                schoolId,
                role: "STUDENT",
                isDeleted: false,
                classId: { not: null }
            },
            _count: { _all: true }
        })
    ]);

    const classIds = studentCountsByClass
        .map((row) => row.classId)
        .filter(Boolean);

    const [feeStructures, classes] = await Promise.all([
        classIds.length && prisma.feeStructure
            ? prisma.feeStructure.findMany({
                where: { schoolId, gradeId: { in: classIds } },
                select: { gradeId: true, amount: true }
            })
            : [],
        classIds.length
            ? prisma.class.findMany({
                where: { id: { in: classIds }, schoolId, isDeleted: false },
                select: { id: true, tuitionFee: true }
            })
            : []
    ]);

    const feeByClassId = new Map();

    feeStructures.forEach((item) => {
        feeByClassId.set(item.gradeId, toNumber(item.amount));
    });

    classes.forEach((cls) => {
        if (!feeByClassId.has(cls.id)) {
            feeByClassId.set(cls.id, toNumber(cls.tuitionFee));
        }
    });

    const expectedFees = studentCountsByClass.reduce((sum, row) => {
        const classFee = feeByClassId.get(row.classId) || 0;
        return sum + (row._count._all * classFee);
    }, 0);

    const totalRevenue = toNumber(paymentsAgg._sum.amount);
    const totalExpenses = toNumber(expensesAgg._sum.amount);
    const netBalance = totalRevenue - totalExpenses;
    const pendingPayments = expectedFees - totalRevenue;

    const noFinancialData = totalRevenue === 0 && totalExpenses === 0 && studentCountsByClass.length === 0;

    return {
        noFinancialData,
        school: {
            id: school.id,
            name: school.name
        },
        totalRevenue,
        totalExpenses,
        netBalance,
        pendingPayments
    };
};

exports.getMonthlyFinanceReportService = async (requester, schoolId, month) => {
    const school = await assertSchoolAccess(requester, schoolId);
    const { selectedMonth, startDate, endDate } = getMonthRange(month);

    const [payments, expenses, paymentsAgg, expensesAgg] = await Promise.all([
        prisma.payment.findMany({
            where: {
                schoolId,
                date: { gte: startDate, lt: endDate }
            },
            select: {
                id: true,
                amount: true,
                date: true,
                paymentType: true,
                status: true,
                invoiceNumber: true,
                student: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                }
            },
            orderBy: { date: "desc" }
        }),
        prisma.expense.findMany({
            where: {
                schoolId,
                isDeleted: false,
                date: { gte: startDate, lt: endDate }
            },
            select: {
                id: true,
                title: true,
                amount: true,
                type: true,
                date: true,
                recipientName: true,
                recipient: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                }
            },
            orderBy: { date: "desc" }
        }),
        prisma.payment.aggregate({
            where: { schoolId, date: { gte: startDate, lt: endDate } },
            _sum: { amount: true }
        }),
        prisma.expense.aggregate({
            where: { schoolId, isDeleted: false, date: { gte: startDate, lt: endDate } },
            _sum: { amount: true }
        })
    ]);

    const totalRevenue = toNumber(paymentsAgg._sum.amount);
    const totalExpenses = toNumber(expensesAgg._sum.amount);

    return {
        school: {
            id: school.id,
            name: school.name
        },
        month: selectedMonth,
        summary: {
            totalRevenue,
            totalExpenses,
            netBalance: totalRevenue - totalExpenses,
            paymentsCount: payments.length,
            expensesCount: expenses.length
        },
        payments,
        expenses
    };
};

exports.exportMonthlyFinanceReportService = async (requester, schoolId, month) => {
    const report = await exports.getMonthlyFinanceReportService(requester, schoolId, month);

    const workbook = XLSX.utils.book_new();

    const summaryRows = [
        { field: "School", value: report.school.name },
        { field: "Month", value: report.month },
        { field: "Total Revenue", value: report.summary.totalRevenue },
        { field: "Total Expenses", value: report.summary.totalExpenses },
        { field: "Net Balance", value: report.summary.netBalance },
        { field: "Payments Count", value: report.summary.paymentsCount },
        { field: "Expenses Count", value: report.summary.expensesCount }
    ];

    const paymentRows = report.payments.map((payment) => ({
        id: payment.id,
        date: payment.date,
        amount: payment.amount,
        paymentType: payment.paymentType,
        status: payment.status,
        invoiceNumber: payment.invoiceNumber || "",
        studentName: payment.student ? `${payment.student.firstName} ${payment.student.lastName}` : ""
    }));

    const expenseRows = report.expenses.map((expense) => ({
        id: expense.id,
        date: expense.date,
        amount: expense.amount,
        type: expense.type,
        title: expense.title,
        recipientName: expense.recipient
            ? `${expense.recipient.firstName} ${expense.recipient.lastName}`
            : (expense.recipientName || "")
    }));

    const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
    const paymentsSheet = XLSX.utils.json_to_sheet(paymentRows.length ? paymentRows : [{ message: "No payments for this month" }]);
    const expensesSheet = XLSX.utils.json_to_sheet(expenseRows.length ? expenseRows : [{ message: "No expenses for this month" }]);

    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
    XLSX.utils.book_append_sheet(workbook, paymentsSheet, "Payments");
    XLSX.utils.book_append_sheet(workbook, expensesSheet, "Expenses");

    return {
        filename: `finance-report-${report.month}.xlsx`,
        buffer: XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
        report
    };
};
