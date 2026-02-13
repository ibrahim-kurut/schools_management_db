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

    return newRequest;
};
