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