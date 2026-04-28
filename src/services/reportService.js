const prisma = require("../utils/prisma");

/**
 * @description Create a platform report snapshot (archive)
 */
exports.createPlatformReportService = async ({ title, year, month, type }) => {
    // 1. Gather current live data for the snapshot
    const [schoolsCount, pendingRequests, activeSubscriptions, planDistribution, recentRequests] = await Promise.all([
        prisma.school.count({ where: { isDeleted: false } }),
        prisma.subscriptionRequest.count({ where: { status: "PENDING" } }),
        prisma.subscription.findMany({
            where: { status: "ACTIVE" },
            include: { plan: { select: { name: true, price: true } }, school: { select: { name: true } } }
        }),
        prisma.subscription.groupBy({
            by: ['planId'],
            where: { status: "ACTIVE" },
            _count: { planId: true }
        }),
        prisma.subscriptionRequest.findMany({
            take: 10,
            orderBy: { createdAt: "desc" },
            include: {
                school: { select: { name: true } },
                plan: { select: { name: true, price: true } }
            }
        })
    ]);

    const totalRevenue = activeSubscriptions.reduce((sum, sub) => sum + (sub.plan?.price || 0), 0);

    // 2. Get plan names for distribution
    const plans = await prisma.plan.findMany({ select: { id: true, name: true } });
    const planMap = {};
    plans.forEach(p => planMap[p.id] = p.name);

    const distribution = planDistribution.map(pd => ({
        planName: planMap[pd.planId] || "غير معروف",
        count: pd._count.planId,
    }));

    // 3. Build the full details snapshot
    const details = {
        planDistribution: distribution,
        activeSchools: activeSubscriptions.map(s => ({
            schoolName: s.school?.name,
            planName: s.plan?.name,
            planPrice: s.plan?.price,
        })),
        recentRequests: recentRequests.map(r => ({
            schoolName: r.school?.name,
            planName: r.plan?.name,
            planPrice: r.plan?.price,
            status: r.status,
            date: r.createdAt,
        })),
    };

    // 4. Save the report
    const report = await prisma.platformReport.create({
        data: {
            title,
            year,
            month: month || null,
            type,
            totalRevenue,
            schoolsCount,
            pendingRequests,
            details,
        }
    });

    return report;
};

/**
 * @description Get all archived platform reports
 */
exports.getAllPlatformReportsService = async () => {
    return prisma.platformReport.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            title: true,
            year: true,
            month: true,
            type: true,
            totalRevenue: true,
            schoolsCount: true,
            pendingRequests: true,
            createdAt: true,
        }
    });
};

/**
 * @description Get a single platform report by ID (with full details)
 */
exports.getPlatformReportByIdService = async (id) => {
    return prisma.platformReport.findUnique({ where: { id } });
};

/**
 * @description Delete a platform report
 */
exports.deletePlatformReportService = async (id) => {
    return prisma.platformReport.delete({ where: { id } });
};
