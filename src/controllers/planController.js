const planService = require("../services/planServies");
const { createPlanSchema } = require("../utils/planValidate");

/**
 * @description Create new Plan
 * @route POST /api/plans
 * @method POST
 * @access private (Super Admin only)
 */
exports.createPlan = async (req, res) => {
    try {
        // 1. Validate the request body
        const { error, value } = createPlanSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        // 2. Call the service to create the plan
        // We pass 'value' which is the validated and cleaned data (e.g. trimmed strings)
        const newPlan = await planService.createPlan(value);

        // 3. Return the response
        res.status(201).json({
            message: "Plan created successfully",
            data: newPlan
        });

    } catch (error) {
        console.error("Create Plan Error:", error);

        // Handle specific business errors (like duplicate name)
        if (error.message === "Plan with this name already exists") {
            return res.status(400).json({ message: error.message });
        }

        // Handle general server errors
        res.status(500).json({ message: "Internal Server Error" });
    }
};