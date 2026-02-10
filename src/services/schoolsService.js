const prisma = require("../utils/prisma");
const redis = require("../config/redis");


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
            subscription: true
        }
    });
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
    const [schools, totleSchools] = await Promise.all([
        prisma.school.findMany({
            where: searchWord ? {
                name: {
                    contains: searchWord,
                    mode: 'insensitive',
                }
            } : {},
            skip: skip,
            take: limit,
            include: {
                subscription: {
                    include: {
                        plan: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc' // Sorting from latest to oldest
            }
        }),
        prisma.school.count({
            where: searchWord ? {
                name: {
                    contains: searchWord,
                    mode: 'insensitive',
                }
            } : {},
        }) // Total count of schools
    ]);

    // 3. Calculating total pages
    const totalPages = Math.ceil(totleSchools / limit);

    // 4. Returning data with pagination info
    return {
        schools,
        currentPage: page,
        totalPages,
        totleSchools,
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

    // 4. Deleting school
    const deletedSchool = await prisma.school.delete({
        where: {
            id: id
        }
    });

    // 5. Invalidate Cache
    await redis.del(`school:${id}`);

    // 6. Returning deleted school
    return deletedSchool;
}