const prisma = require("../utils/prisma");
const redis = require("../config/redis");
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

const getRecentMonths = (count) => {
    const now = new Date();
    const months = [];
    for (let i = count - 1; i >= 0; i -= 1) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
            key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
            label: d.toLocaleString("ar", { month: "long" })
        });
    }
    return months;
};

exports.getFinanceStatsService = async (requester, schoolId) => {
    const school = await assertSchoolAccess(requester, schoolId);

    // 0. Check Redis Cache
    const cacheKey = `school:${schoolId}:finance-stats`;
    try {
        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
    } catch (err) {
        console.error("Redis Get Error:", err);
    }

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

    const result = {
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

    // Save to Redis Cache (10 minutes)
    try {
        await redis.set(cacheKey, JSON.stringify(result), 'EX', 600);
    } catch (err) {
        console.error("Redis Set Error:", err);
    }

    return result;
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

exports.getFinanceDashboardDetailsService = async (requester, schoolId, months = 6) => {
    await assertSchoolAccess(requester, schoolId);
    
    // 0. Check Redis Cache
    const normalizedMonths = Math.min(Math.max(parseInt(months, 10) || 6, 1), 12);
    const cacheKey = `school:${schoolId}:finance-dashboard:months:${normalizedMonths}`;
    try {
        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
    } catch (err) {
        console.error("Redis Get Error:", err);
    }

    const monthRefs = getRecentMonths(normalizedMonths);

    const [payments, expenses] = await Promise.all([
        prisma.payment.findMany({
            where: { schoolId },
            select: { amount: true, date: true, student: { select: { firstName: true, lastName: true } } },
            orderBy: { date: "desc" }
        }),
        prisma.expense.findMany({
            where: { schoolId, isDeleted: false },
            select: { amount: true, date: true, title: true },
            orderBy: { date: "desc" }
        })
    ]);

    const chartData = monthRefs.map((m) => ({ month: m.label, income: 0, expense: 0, key: m.key }));
    const chartMap = new Map(chartData.map((item) => [item.key, item]));

    payments.forEach((p) => {
        const key = `${p.date.getFullYear()}-${String(p.date.getMonth() + 1).padStart(2, "0")}`;
        const row = chartMap.get(key);
        if (row) row.income += toNumber(p.amount);
    });

    expenses.forEach((e) => {
        const key = `${e.date.getFullYear()}-${String(e.date.getMonth() + 1).padStart(2, "0")}`;
        const row = chartMap.get(key);
        if (row) row.expense += toNumber(e.amount);
    });

    const recentOperations = [
        ...payments.slice(0, 10).map((payment) => ({
            type: "PAYMENT",
            title: payment.student ? `دفعة رسوم - ${payment.student.firstName} ${payment.student.lastName}` : "دفعة رسوم طالب",
            amount: toNumber(payment.amount),
            date: payment.date
        })),
        ...expenses.slice(0, 10).map((expense) => ({
            type: "EXPENSE",
            title: expense.title || "مصروف",
            amount: toNumber(expense.amount),
            date: expense.date
        }))
    ]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);

    const result = { chartData, recentOperations };

    // Save to Redis Cache (15 minutes)
    try {
        await redis.set(cacheKey, JSON.stringify(result), 'EX', 900);
    } catch (err) {
        console.error("Redis Set Error:", err);
    }

    return result;
};
