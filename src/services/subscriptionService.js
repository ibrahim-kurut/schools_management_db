const prisma = require("../utils/prisma");
const redis = require("../config/redis");
const { createNotificationService } = require("./notificationService");


/**
 * @description Create a subscription request (School Admin)
 * @route /api/subscriptions/request
 * @method POST
 * @access private (School Admin only)
 */
exports.createSubscriptionRequestService = async (schoolId, planId, paymentReceipt) => {
    // 1. Check if school and plan exist (parallel queries for performance)
    const [school, plan, existingRequest] = await Promise.all([
        prisma.school.findUnique({ where: { id: schoolId } }),
        prisma.plan.findUnique({ where: { id: planId } }),
        prisma.subscriptionRequest.findFirst({
            where: {
                schoolId,
                status: "PENDING"
            }
        })
    ]);

    if (!school) {
        throw new Error("School not found");
    }

    if (!plan) {
        throw new Error("Plan not found");
    }

    // 2. Check if there's already a pending request
    if (existingRequest) {
        throw new Error("You already have a pending subscription request");
    }

    // 3. Create the request
    const newRequest = await prisma.subscriptionRequest.create({
        data: {
            schoolId,
            planId,
            // paymentReceipt, // تم إيقاف الاعتماد على إيصال الدفع
            status: "PENDING"
        },
        include: {
            plan: {
                select: {
                    name: true,
                    price: true,
                    durationInDays: true
                }
            }
        }
    });

    // 4. Invalidate cache to ensure fresh data
    await Promise.all([
        redis.del('subscription-requests-all'),
        redis.del('subscription-requests-PENDING'),
        redis.del('subscription-requests-APPROVED'),
        redis.del('subscription-requests-REJECTED'),
        redis.del('subscription-requests-count')
    ]);

    // إرسال إشعار للمدراء العامين (Super Admins)
    try {
        const superAdmins = await prisma.user.findMany({
            where: { role: 'SUPER_ADMIN' },
            select: { id: true }
        });
        
        for (const admin of superAdmins) {
            await createNotificationService(
                admin.id,
                "طلب اشتراك جديد",
                `قامت مدرسة "${school.name}" بطلب الاشتراك في باقة "${plan.name}". يرجى مراجعة الطلب.`,
                "SUBSCRIPTION_REQUEST"
            );
        }
    } catch (err) {
        console.error("Failed to send notification to Super Admins:", err);
    }

    return newRequest;
};

/**
 * @description Get subscription requests (Super Admin)
 * @route /api/subscriptions/requests
 * @method GET
 * @access private (Super Admin only)
 */
exports.getSubscriptionRequestsService = async (status) => {
    // Build where clause based on status filter
    const where = status ? { status } : {};

    // Check cache first
    const cacheKey = `subscription-requests-${status || 'all'}`;
    const cachedRequests = await redis.get(cacheKey);
    if (cachedRequests) {
        return JSON.parse(cachedRequests);
    }

    // Fetch from database
    const requests = await prisma.subscriptionRequest.findMany({
        where,
        include: {
            school: {
                select: {
                    name: true,
                    phone: true
                }
            },
            plan: {
                select: {
                    name: true,
                    price: true,
                    durationInDays: true
                }
            }
        },
        orderBy: {
            createdAt: "desc"
        }
    });

    // Cache for 5 minutes (300 seconds)
    await redis.set(cacheKey, JSON.stringify(requests), 'EX', 300);

    return requests;
}

/**
 * @description Approve a subscription request (Super Admin)
 * @route /api/subscriptions/approve/:id
 * @method POST
 * @access private (Super Admin only)
 */
exports.approveSubscriptionService = async (requestId, adminNotes) => {
    // 1. Find the subscription request
    const request = await prisma.subscriptionRequest.findUnique({
        where: { id: requestId },
        include: {
            plan: true,
            school: true
        }
    });

    if (!request) {
        throw new Error("Subscription request not found");
    }

    // 2. Check if already processed
    if (request.status !== "PENDING") {
        throw new Error(`Request already ${request.status.toLowerCase()}`);
    }

    // 3. Calculate subscription dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + request.plan.durationInDays);

    // 4. Use transaction to update request and create/update subscription
    const result = await prisma.$transaction(async (tx) => {
        // Update the request status
        const updatedRequest = await tx.subscriptionRequest.update({
            where: { id: requestId },
            data: {
                status: "APPROVED",
                adminNotes: adminNotes || null
            }
        });

        // Create or update the subscription
        const subscription = await tx.subscription.upsert({
            where: { schoolId: request.schoolId },
            update: {
                planId: request.planId,
                startDate,
                endDate,
                status: "ACTIVE"
            },
            create: {
                schoolId: request.schoolId,
                planId: request.planId,
                startDate,
                endDate,
                status: "ACTIVE"
            }
        });

        return { updatedRequest, subscription };
    });

    // إرسال إشعار لمدير المدرسة (مالك المدرسة)
    try {
        if (request.school && request.school.ownerId) {
            await createNotificationService(
                request.school.ownerId,
                "تمت الموافقة على اشتراكك 🎉",
                `تمت الموافقة على طلب مدرسة "${request.school.name}" للاشتراك في باقة "${request.plan.name}". ${adminNotes ? `ملاحظات الإدارة: ${adminNotes}` : ''}`,
                "SUBSCRIPTION_UPDATE"
            );
        }
    } catch (err) {
        console.error("Failed to send notification to School Admin:", err);
    }

    // 5. Invalidate cache
    await Promise.all([
        redis.del('subscription-requests-all'),
        redis.del('subscription-requests-PENDING'),
        redis.del('subscription-requests-APPROVED'),
        redis.del('subscription-requests-REJECTED'),
        redis.del('subscription-requests-count'),
        redis.del(`school:${request.schoolId}:subscription`)
    ]);

    return result;
};

/**
 * @description Reject a subscription request (Super Admin)
 * @route /api/subscriptions/reject/:id
 * @method POST
 * @access private (Super Admin only)
 */
exports.rejectSubscriptionService = async (requestId, adminNotes) => {
    // 1. Find the subscription request
    const request = await prisma.subscriptionRequest.findUnique({
        where: { id: requestId }
    });

    if (!request) {
        throw new Error("Subscription request not found");
    }

    // 2. Check if already processed
    if (request.status !== "PENDING") {
        throw new Error(`Request already ${request.status.toLowerCase()}`);
    }

    // 3. Update the request status to REJECTED
    const updatedRequest = await prisma.subscriptionRequest.update({
        where: { id: requestId },
        data: {
            status: "REJECTED",
            adminNotes
        },
        include: {
            plan: true,
            school: true
        }
    });

    // إرسال إشعار لمدير المدرسة (مالك المدرسة)
    try {
        if (updatedRequest.school && updatedRequest.school.ownerId) {
            await createNotificationService(
                updatedRequest.school.ownerId,
                "تم رفض طلب الاشتراك",
                `نأسف لإبلاغك بأنه تم رفض طلب مدرسة "${updatedRequest.school.name}" للاشتراك في باقة "${updatedRequest.plan.name}". ملاحظات الإدارة: ${adminNotes}`,
                "SUBSCRIPTION_UPDATE"
            );
        }
    } catch (err) {
        console.error("Failed to send notification to School Admin:", err);
    }

    // 4. Invalidate cache
    await Promise.all([
        redis.del('subscription-requests-all'),
        redis.del('subscription-requests-PENDING'),
        redis.del('subscription-requests-APPROVED'),
        redis.del('subscription-requests-REJECTED'),
        redis.del('subscription-requests-count'),
        redis.del(`school:${updatedRequest.schoolId}:subscription`)
    ]);

    return updatedRequest;
};
/**
 * @description Get the count of pending subscription requests (Super Admin)
 * @route /api/subscriptions/requests/count
 * @method GET
 * @access private (Super Admin only)
 */
exports.getPendingRequestsCountService = async () => {
    // Check cache first
    const cacheKey = 'subscription-requests-count';
    const cachedCount = await redis.get(cacheKey);
    if (cachedCount !== null) {
        return parseInt(cachedCount);
    }

    // Fetch from database
    const count = await prisma.subscriptionRequest.count({
        where: { status: "PENDING" }
    });

    // Cache for 5 minutes
    await redis.set(cacheKey, count.toString(), 'EX', 300);

    return count;
};

/**
 * @description Get subscription of a specific school (School Admin)
 * @param {string} schoolId 
 * @returns {Promise<Object>} Subscription details with plan and usage
 */
exports.getMySubscriptionService = async (schoolId) => {
    // 0. Check Redis Cache
    const cacheKey = `school:${schoolId}:subscription`;
    try {
        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
    } catch (err) {
        console.error("Redis Get Error:", err);
    }

    // 1. Fetch subscription with plan
    const subscription = await prisma.subscription.findUnique({
        where: { schoolId },
        include: {
            plan: true
        }
    });

    if (!subscription) {
        return null;
    }

    // 2. Fetch current student count
    const studentCount = await prisma.user.count({
        where: {
            schoolId,
            role: "STUDENT",
            isDeleted: false
        }
    });

    const result = {
        ...subscription,
        usage: {
            studentCount,
            maxStudents: subscription.plan.maxStudents,
            bufferStudents: subscription.plan.bufferStudents,
            totalLimit: subscription.plan.maxStudents + subscription.plan.bufferStudents
        }
    };

    // 3. Save to Redis Cache (1 hour)
    try {
        await redis.set(cacheKey, JSON.stringify(result), 'EX', 3600);
    } catch (err) {
        console.error("Redis Set Error:", err);
    }

    return result;
};

/**
 * @description Settle or pay a portion of debt for a specific school (Super Admin)
 * @param {string} schoolId 
 * @param {number} amountPaid
 * @returns {Promise<Object>} Updated subscription
 */
exports.settleDebtService = async (schoolId, amountPaid) => {
    // 1. Verify subscription exists
    const subscription = await prisma.subscription.findUnique({
        where: { schoolId }
    });

    if (!subscription) {
        throw new Error("Subscription not found for this school");
    }

    // Calculate new debt
    let newDebt = subscription.currentDebt;
    if (amountPaid !== undefined && amountPaid !== null) {
        const numAmount = parseFloat(amountPaid);
        if (isNaN(numAmount) || numAmount < 0) {
            throw new Error("Invalid payment amount");
        }
        newDebt = Math.max(0, subscription.currentDebt - numAmount);
    } else {
        // If no amount provided, settle all debt
        newDebt = 0;
    }

    // 2. Update debt
    const updatedSubscription = await prisma.subscription.update({
        where: { schoolId },
        data: {
            currentDebt: newDebt
        }
    });

    // 3. Invalidate relevant caches
    await redis.del(`school:${schoolId}`);
    await redis.del(`school:${schoolId}:subscription`);

    return updatedSubscription;
};

/**
 * @description Add debt for a specific school (Super Admin)
 * @param {string} schoolId 
 * @param {number} amount
 * @returns {Promise<Object>} Updated subscription
 */
exports.addDebtService = async (schoolId, amount) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error("يجب تحديد مبلغ صالح لزيادة الدين");
    }

    const subscription = await prisma.subscription.findUnique({
        where: { schoolId }
    });

    if (!subscription) {
        throw new Error("لم يتم العثور على اشتراك لهذه المدرسة");
    }

    const updatedSubscription = await prisma.subscription.update({
        where: { schoolId },
        data: {
            currentDebt: subscription.currentDebt + numAmount
        }
    });

    await redis.del(`school:${schoolId}`);
    await redis.del(`school:${schoolId}:subscription`);

    return updatedSubscription;
};

/**
 * @description Update subscription plan and status by Super Admin
 * @param {string} schoolId 
 * @param {Object} data { planId, status, endDate }
 * @returns {Promise<Object>} Updated subscription
 */
exports.updateSubscriptionBySuperAdminService = async (schoolId, data) => {
    // 1. Validate planId exists and is not empty
    if (!data.planId) {
        throw new Error("يجب اختيار باقة اشتراك للمدرسة");
    }

    // 2. Verify Plan exists before attempting to connect
    const planExists = await prisma.plan.findUnique({
        where: { id: data.planId }
    });
    if (!planExists) {
        throw new Error("باقة الاشتراك المختارة غير موجودة");
    }

    // 3. Upsert subscription (Update if exists, Create if not)
    const updatedSubscription = await prisma.subscription.upsert({
        where: { schoolId },
        update: {
            planId: data.planId,
            status: data.status,
            endDate: data.endDate ? new Date(data.endDate) : undefined
        },
        create: {
            school: { connect: { id: schoolId } },
            plan: { connect: { id: data.planId } },
            status: data.status || "PENDING",
            endDate: data.endDate ? new Date(data.endDate) : new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        },
        include: {
            plan: true
        }
    });

    // 4. Invalidate cache
    await redis.del(`school:${schoolId}`);
    await redis.del(`school:${schoolId}:subscription`);

    return updatedSubscription;
};

/**
 * @description Get pending subscription request for a specific school
 * @param {string} schoolId 
 */
exports.getMyPendingRequestService = async (schoolId) => {
    return await prisma.subscriptionRequest.findFirst({
        where: {
            schoolId,
            status: "PENDING"
        },
        include: {
            plan: true
        }
    });
};

/**
 * @description Get platform-wide stats for Super Admin dashboard
 * @returns {Promise<Object>} Statistics overview
 */
exports.getPlatformStatsService = async () => {
    const cacheKey = 'platform-stats-overview';
    
    try {
        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
    } catch (err) {
        console.error("Redis Get Error:", err);
    }

    const [totalSchools, pendingRequests, activeSubscriptions, recentRequests] = await Promise.all([
        prisma.school.count({ where: { isDeleted: false } }),
        prisma.subscriptionRequest.count({ where: { status: "PENDING" } }),
        prisma.subscription.findMany({
            where: { status: "ACTIVE" },
            include: { plan: true }
        }),
        prisma.subscriptionRequest.findMany({
            take: 5,
            orderBy: { createdAt: "desc" },
            include: {
                school: { select: { name: true, logo: true } },
                plan: { select: { name: true, price: true } }
            }
        })
    ]);

    // Calculate total revenue from active subscriptions (simplified as annual revenue)
    const totalRevenue = activeSubscriptions.reduce((sum, sub) => sum + (sub.plan.price || 0), 0);

    const stats = {
        totalSchools,
        pendingRequests,
        totalRevenue,
        recentRequests
    };

    // Cache for 10 minutes
    try {
        await redis.set(cacheKey, JSON.stringify(stats), 'EX', 600);
    } catch (err) {
        console.error("Redis Set Error:", err);
    }

    return stats;
};

/**
 * @description Get growth stats for charts
 * @returns {Promise<Object>} Monthly growth and plan distribution
 */
exports.getPlatformGrowthStatsService = async () => {
    const cacheKey = 'platform-growth-stats';
    
    try {
        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
    } catch (err) {
        console.error("Redis Get Error:", err);
    }

    // 1. Get all schools and subscriptions to calculate growth
    const [schools, subscriptions, plans] = await Promise.all([
        prisma.school.findMany({
            where: { isDeleted: false },
            select: { createdAt: true }
        }),
        prisma.subscription.findMany({
            where: { status: "ACTIVE" },
            include: { plan: { select: { name: true } } }
        }),
        prisma.plan.findMany({
            select: { name: true, id: true }
        })
    ]);

    // 2. Process Monthly Growth (Last 6 months)
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = date.toLocaleString('ar-EG', { month: 'short' });
        months.push({
            name: monthName,
            schools: 0,
            revenue: 0,
            monthIndex: date.getMonth(),
            year: date.getFullYear()
        });
    }

    schools.forEach(school => {
        const d = new Date(school.createdAt);
        const monthData = months.find(m => m.monthIndex === d.getMonth() && m.year === d.getFullYear());
        if (monthData) monthData.schools++;
    });

    // 3. Process Plan Distribution
    const planCounts = {};
    plans.forEach(p => planCounts[p.name] = 0);
    
    subscriptions.forEach(sub => {
        if (sub.plan && planCounts[sub.plan.name] !== undefined) {
            planCounts[sub.plan.name]++;
        }
    });

    const planDistribution = Object.entries(planCounts).map(([name, count]) => ({
        name,
        value: count,
        percentage: subscriptions.length > 0 ? Math.round((count / subscriptions.length) * 100) : 0
    }));

    const result = {
        monthlyGrowth: months.map(({ name, schools, revenue }) => ({ name, schools, revenue })),
        planDistribution
    };

    // Cache for 1 hour
    try {
        await redis.set(cacheKey, JSON.stringify(result), 'EX', 3600);
    } catch (err) {
        console.error("Redis Set Error:", err);
    }

    return result;
};

