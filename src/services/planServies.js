const prisma = require("../utils/prisma");

/**
 * @description Create new Plan
 * @route POST /api/plans
 * @method POST
 * @access private
 */
exports.createPlan = async (planData) => {
    //1. Check if there is already a plan with the same name.
    const existingPlan = await prisma.plan.findUnique({
        where: { name: planData.name }
    });

    //2. If a plan with the same name already exists, throw an error.
    if (existingPlan) {
        throw new Error("Plan with this name already exists");
    }

    //3. If there is no duplicate, create a new plan.
    const newPlan = await prisma.plan.create({
        data: planData
    });

    //4. Return the new plan
    return newPlan;
};

/**
 * @description Get all plans
 * @route GET /api/plans
 * @method GET
 * @access private
 */
exports.getAllPlans = async () => {
    //1. Get all plans
    const plans = await prisma.plan.findMany();
    //2. Return the plans
    return plans;
};

/**
 * @description Get plan by id
 * @route GET /api/plans/:id
 * @method GET
 * @access private
 */
exports.getPlanById = async (id) => {
    //1. Get the plan by id
    const plan = await prisma.plan.findUnique({
        where: { id: id }
    });
    //2. Return the plan
    return plan;
};

/**
 * @description Update plan by id
 * @route PUT /api/plans/:id
 * @method PUT
 * @access private
 */
exports.updatePlanById = async (id, planData) => {
    //1. Get the plan by id
    const plan = await prisma.plan.findUnique({
        where: { id: id }
    });
    //2. If the plan does not exist, throw an error.
    if (!plan) {
        throw new Error("Plan not found");
    }
    //3. Update the plan
    const updatedPlan = await prisma.plan.update({
        where: { id: id },
        data: planData
    });
    //4. Return the updated plan
    return updatedPlan;
};

/**
 * @description delete plan
 * @route DELETE /api/plans/:id
 * @method DELETE
 * @access private (Super Admin only)
 */
exports.deletePlan = async (id) => {
    //1. Get the plan by id
    const plan = await prisma.plan.findUnique({
        where: { id: id }
    });
    //2. If the plan does not exist, throw an error.
    if (!plan) {
        throw new Error("Plan not found");
    }
    //3. Delete the plan
    const deletedPlan = await prisma.plan.delete({
        where: { id: id }
    });
    //4. Return the deleted plan
    return deletedPlan;
};
