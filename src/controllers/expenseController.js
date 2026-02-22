const { createExpenseService } = require("../services/expenseService");
const asyncHandler = require("../utils/asyncHandler");
const { createExpenseSchema } = require("../utils/expenseValidate");


exports.createExpenseController = asyncHandler(async (req, res) => {
    // 1. Validate Input
    const { error } = createExpenseSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            status: "FAIL",
            message: error.details[0].message
        });
    }

    const { title, amount, date, type, recipientId } = req.body;
    const requester = req.user;
    // 2. call service and pass the requester and the expense data
    const expense = await createExpenseService(requester, { title, amount, date, type, recipientId });

    res.status(201).json({
        status: "SUCCESS",
        message: "Expense created successfully",
        data: expense,
    });
});