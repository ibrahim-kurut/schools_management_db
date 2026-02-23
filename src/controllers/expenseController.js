const { createExpenseService, getAllExpensesService, getExpenseByIdService } = require("../services/expenseService");
const asyncHandler = require("../utils/asyncHandler");
const { createExpenseSchema } = require("../utils/expenseValidate");


/**
 * @description Create new expense
 * @route  /api/expenses
 * @method POST
 * @access private (school admin, teacher)
 */
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

/**
 * @description get all expenses
 * @route  /api/expenses
 * @method GET
 * @access private (school admin, teacher)
 */
exports.getAllExpensesController = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const requester = req.user;

    const result = await getAllExpensesService(requester, parseInt(page), parseInt(limit));

    res.status(200).json({
        status: "SUCCESS",
        message: "Expenses fetched successfully",
        data: result.expenses,
        pagination: result.pagination
    });
});

/**
 * @description get expense by id
 * @route  /api/expenses/:id
 * @method GET
 * @access private (school admin, teacher)
 */
exports.getExpenseByIdController = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const requester = req.user;
    const expense = await getExpenseByIdService(requester, id);

    if (!expense) {
        return res.status(404).json({
            status: "FAIL",
            message: "Expense record not found"
        });
    }

    res.status(200).json({
        status: "SUCCESS",
        message: "Expense fetched successfully",
        data: expense,
    });
});
