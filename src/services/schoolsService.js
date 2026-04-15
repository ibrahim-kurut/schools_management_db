const prisma = require("../utils/prisma");
const redis = require("../config/redis");
const { createNotificationService } = require("./notificationService");


/**
 * @description Create a new school
 * @route POST /api/schools
 * @method POST
 * @access private
 */
exports.createSchoolService = async (schoolData) => {
    // 1. check if school exists
    const school = await prisma.school.findUnique({
        where: {
            name: schoolData.name
        }
    });
    if (school) {
        throw new Error("School already exists");
    }

    // 2. Generate Slug
    let slug = schoolData.slug;
    if (slug) {
        slug = slug.toLowerCase().replace(/ /g, '-');
    } else {
        slug = schoolData.name.toLowerCase().replace(/ /g, '-');
    }
    schoolData.slug = slug;

    // 3. Determine Plan ID & Status
    let planId = schoolData.planId;
    let subscriptionStatus = "PENDING";
    let planDuration; // Default fallback

    if (planId) {
        // If plan is provided, verify it exists and check price
        const selectedPlan = await prisma.plan.findUnique({
            where: { id: planId }
        });

        if (!selectedPlan) {
            throw new Error("Invalid Plan ID");
        }
        if (selectedPlan.price === 0) {
            subscriptionStatus = "ACTIVE";
        }
        planDuration = selectedPlan.durationInDays;

    } else {
        // Default to Free Plan
        const freePlan = await prisma.plan.findFirst({
            where: { price: 0 }
        });
        if (!freePlan) {
            throw new Error("No free plan available. Please contact support.");
        }
        planId = freePlan.id;
        subscriptionStatus = "ACTIVE";
        planDuration = freePlan.durationInDays;
    }

    // 4. create school


    const endDate = new Date();
    // تحديد نهاية الاشتراك بناءً على مدة الخطة
    endDate.setDate(endDate.getDate() + planDuration);


    const newSchool = await prisma.school.create({
        data: {
            name: schoolData.name,
            slug: slug,
            address: schoolData.address,
            phone: schoolData.phone,
            logo: schoolData.logo,
            ownerId: schoolData.userId,

            subscription: {
                create: {
                    planId: planId,
                    endDate: endDate,
                    status: subscriptionStatus
                }
            },
        },
        include: {
            subscription: {
                include: {
                    plan: true
                }
            }
        }
    });

    // 4.5. If it's a paid plan, create a SubscriptionRequest so it appears for Super Admin
    if (subscriptionStatus === "PENDING") {
        try {
            await prisma.subscriptionRequest.create({
                data: {
                    schoolId: newSchool.id,
                    planId: planId,
                    status: "PENDING"
                }
            });

            // Notify Super Admins
            const superAdmins = await prisma.user.findMany({
                where: { role: 'SUPER_ADMIN' },
                select: { id: true }
            });

            for (const admin of superAdmins) {
                await createNotificationService(
                    admin.id,
                    "طلب اشتراك مدرسة جديدة",
                    `قامت مدرسة "${newSchool.name}" بالتسجيل واختيار باقة "${newSchool.subscription.plan.name}". يرجى مراجعة الطلب وتفعيله.`,
                    "SUBSCRIPTION_REQUEST"
                );
            }
        } catch (requestErr) {
            console.error("Failed to create subscription request or notify admins:", requestErr);
            // We don't throw here to avoid failing school creation if notification/request record fails
        }
    }

    // 5. return school
    return newSchool;
}

/**
 * @description Get a school all schools
 * @route GET /api/schools
 * @method GET
 * @access private
 */
exports.getAllSchoolsService = async (page, limit, searchWord) => {
    // 1. Counting the number of items we skip
    const skip = (page - 1) * limit;

    // 2. Fetching data with total count
    const [schools, totalSchools] = await Promise.all([
        prisma.school.findMany({
            where: {
                isDeleted: false,
                ...(searchWord ? {
                    name: {
                        contains: searchWord,
                        mode: 'insensitive',
                    }
                } : {})
            },
            skip: skip,
            take: limit,
            include: {
                owner: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                },
                subscription: {
                    include: {
                        plan: true,
                    },
                },
                _count: {
                    select: {
                        members: {
                            where: { role: 'STUDENT', isDeleted: false }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        }),
        prisma.school.count({
            where: {
                isDeleted: false,
                ...(searchWord ? {
                    name: {
                        contains: searchWord,
                        mode: 'insensitive',
                    }
                } : {})
            },
        })
    ]);

    // 3. Calculating total pages
    const totalPages = Math.ceil(totalSchools / limit);

    // 4. Returning data with pagination info
    return {
        schools,
        currentPage: page,
        totalPages,
        totleSchools: totalSchools, // Keeping the original key name to avoid breaking frontend/controller
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
    };
}
/**
 * @description Get a school by id
 * @route GET /api/schools/:id
 * @method GET
 * @access private
 */
exports.getSchoolByIdService = async (id, userId, userRole) => {

    // 0. Check Redis Cache
    const cacheKey = `school:${id}`;
    const cachedSchool = await redis.get(cacheKey);

    if (cachedSchool) {
        // Return cached data if available
        return JSON.parse(cachedSchool);
    }

    // 1. Fetching school by id
    const school = await prisma.school.findUnique({
        where: {
            id: id
        },
        include: {
            subscription: {
                include: {
                    plan: true,
                },
            },
        }
    });

    // 2. Check if school exists
    if (!school) {
        return null;
    }

    // 3. Authorization check: Only owner or SUPER_ADMIN can access
    if (userId !== school.ownerId && userRole !== "SUPER_ADMIN") {
        throw new Error("FORBIDDEN");
    }

    // 4. Save to Redis Cache (for 1 hour = 3600 seconds)
    await redis.set(cacheKey, JSON.stringify(school), 'EX', 3600);

    // 5. Returning school
    return school;
}

/**
 * @description Update a school by id
 * @route PUT /api/schools/:id
 * @method PUT
 * @access private (owner or super admin)
 */
exports.updateSchoolByIdService = async (id, schoolData, userId, userRole) => {
    // 1. Fetching school by id
    const school = await prisma.school.findUnique({
        where: {
            id: id
        }
    });

    // 2. Check if school exists
    if (!school) {
        return null;
    }

    // 3. Authorization check: Only owner or SUPER_ADMIN can access
    if (userId !== school.ownerId && userRole !== "SUPER_ADMIN") {
        throw new Error("FORBIDDEN");
    }

    // 4. Normalize slug if provided
    if (schoolData.slug) {
        schoolData.slug = schoolData.slug.toLowerCase().replace(/ /g, '-');
    }

    // 5. Prevent SCHOOL_ADMIN from changing planId (only SUPER_ADMIN can)
    if (schoolData.planId && userRole !== "SUPER_ADMIN") {
        delete schoolData.planId;
    }

    // 6. Updating school
    const updatedSchool = await prisma.school.update({
        where: {
            id: id
        },
        data: schoolData
    });

    // 7. Invalidate Cache (Delete the old data so next fetch gets fresh data)
    await redis.del(`school:${id}`);

    // 7. Returning updated school
    return updatedSchool;
}


/**
 * @description Delete a school by id
 * @route DELETE /api/schools/:id
 * @method DELETE
 * @access private (owner or super admin)
 */
exports.deleteSchoolByIdService = async (id, userId, userRole) => {
    // 1. Fetching school by id
    const school = await prisma.school.findUnique({
        where: {
            id: id
        }
    });

    // 2. Check if school exists
    if (!school) {
        return null;
    }

    // 3. Authorization check: Only owner or SUPER_ADMIN can access
    if (userId !== school.ownerId && userRole !== "SUPER_ADMIN") {
        throw new Error("FORBIDDEN");
    }

    // 4. Soft deleting school (Archive)
    const deletedSchool = await prisma.school.update({
        where: {
            id: id
        },
        data: {
            isDeleted: true,
            deletedAt: new Date()
        }
    });

    // 5. Invalidate Cache
    await redis.del(`school:${id}`);

    // 6. Returning deleted school
    return deletedSchool;
}

/**
 * @description Get school stats overview
 * @route GET /api/schools/stats/overview
 * @method GET
 * @access private
 */
exports.getSchoolStatsOverviewService = async (schoolId) => {
    const [totalStudents, totalStaff, totalClasses, totalRevenueResult] = await Promise.all([
        prisma.user.count({ where: { schoolId, role: 'STUDENT', isDeleted: false } }),
        prisma.user.count({ where: { schoolId, role: { in: ['TEACHER', 'ASSISTANT', 'ACCOUNTANT', 'SCHOOL_ADMIN'] }, isDeleted: false } }),
        prisma.class.count({ where: { schoolId, isDeleted: false } }),
        prisma.payment.aggregate({
            where: { schoolId, status: 'COMPLETED' },
            _sum: { amount: true }
        })
    ]);

    return {
        totalStudents: totalStudents || 0,
        totalStaff: totalStaff || 0,
        totalClasses: totalClasses || 0,
        totalRevenue: totalRevenueResult._sum.amount || 0
    };
}