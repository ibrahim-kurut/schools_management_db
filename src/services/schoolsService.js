const prisma = require("../utils/prisma");


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
exports.getAllSchoolsService = async (page, limit) => {
    // 1. Counting the number of items we skip
    const skip = (page - 1) * limit;

    // 2. Fetching data with total count
    const [schools, totleSchools] = await Promise.all([
        prisma.school.findMany({
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
        prisma.school.count() // Total count of schools
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