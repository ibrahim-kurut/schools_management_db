const planService = require("../services/planServices");
const { createPlanSchema, updatePlanSchema } = require("../utils/planValidate");
const { validateId } = require("../utils/validateUUID");
const asyncHandler = require("../utils/asyncHandler");

/**
 * @description Create new Plan
 * @route POST /api/plans
 * @method POST
 * @access private (Super Admin only)
 */
exports.createPlan = asyncHandler(async (req, res) => {
    // 1. Validate the request body
    const { error, value } = createPlanSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }

    // 2. Call the service to create the plan
    const newPlan = await planService.createPlan(value);

    // 3. Return the response
    res.status(201).json({
        message: "Plan created successfully",
        data: newPlan
    });
});

/**
 * @description Get all plans
 * @route GET /api/plans
 * @method GET
 * @access private (Super Admin only)
 */
exports.getAllPlans = asyncHandler(async (req, res) => {
    // 1. Call the service to get all plans
    const plans = await planService.getAllPlans();

    // 2. Return the response
    res.status(200).json({
        message: "Plans retrieved successfully",
        plans: plans
    });
});

/**
 * @description Get plan by id
 * @route GET /api/plans/:id
 * @method GET
 * @access private (Super Admin only)
 */
exports.getPlanById = asyncHandler(async (req, res) => {
    // 1. validate id
    const { error, value } = validateId(req.params.id);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }

    // 2. Get the plan by id
    const plan = await planService.getPlanById(value.id);

    if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
    }

    // 3. Return the response
    res.status(200).json({
        message: "Plan retrieved successfully",
        plan: plan
    });
});

/**
 * @description Update plan by id
 * @route PUT /api/plans/:id
 * @method PUT
 * @access private (Super Admin only)
 */
exports.updatePlanById = asyncHandler(async (req, res) => {
    // 1. validate id
    const { error, value } = validateId(req.params.id);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }

    // 2. Validate the request body
    const { error: updateError, value: updateValue } = updatePlanSchema.validate(req.body);
    if (updateError) {
        return res.status(400).json({ message: updateError.details[0].message });
    }

    // 3. Update the plan
    const updatedPlan = await planService.updatePlanById(value.id, updateValue);

    // 4. Return the response
    res.status(200).json({
        message: "Plan updated successfully",
        plan: updatedPlan
    });
});

/**
 * @description delete plan
 * @route DELETE /api/plans/:id
 * @method DELETE
 * @access private (Super Admin only)
 */
exports.deletePlan = asyncHandler(async (req, res) => {
    // 1. validate id
    const { error, value } = validateId(req.params.id);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }

    // 2. Delete the plan
    const deletedPlan = await planService.deletePlan(value.id);

    // 3. Return the response
    res.status(200).json({
        message: "Plan deleted successfully",
        plan: deletedPlan
    });
});
