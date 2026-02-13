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
        redis.del('subscription-requests-REJECTED')
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
