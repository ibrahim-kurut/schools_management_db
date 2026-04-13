const prisma = require("../utils/prisma");
const redis = require("../config/redis");


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
            paymentReceipt,
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

    // 5. Invalidate cache
    await Promise.all([
        redis.del('subscription-requests-all'),
        redis.del('subscription-requests-PENDING'),
        redis.del('subscription-requests-APPROVED'),
        redis.del('subscription-requests-REJECTED'),
        redis.del('subscription-requests-count')
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
        }
    });

    // 4. Invalidate cache
    await Promise.all([
        redis.del('subscription-requests-all'),
        redis.del('subscription-requests-PENDING'),
        redis.del('subscription-requests-APPROVED'),
        redis.del('subscription-requests-REJECTED'),
        redis.del('subscription-requests-count')
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

    return {
        ...subscription,
        usage: {
            studentCount,
            maxStudents: subscription.plan.maxStudents,
            bufferStudents: subscription.plan.bufferStudents,
            totalLimit: subscription.plan.maxStudents + subscription.plan.bufferStudents
        }
    };
};

/**
 * @description Settle debt for a specific school (Super Admin)
 * @param {string} schoolId 
 * @returns {Promise<Object>} Updated subscription
 */
exports.settleDebtService = async (schoolId) => {
    // 1. Verify subscription exists
    const subscription = await prisma.subscription.findUnique({
        where: { schoolId }
    });

    if (!subscription) {
        throw new Error("Subscription not found for this school");
    }

    // 2. Update debt to 0
    const updatedSubscription = await prisma.subscription.update({
        where: { schoolId },
        data: {
            currentDebt: 0
        }
    });

    // 3. Invalidate relevant caches if any (optional, but good practice)
    await redis.del(`school:${schoolId}`);

    return updatedSubscription;
};
