const express = require('express');
const { createExpenseController, getAllExpensesController, getExpenseByIdController, updateExpenseController } = require('../controllers/expenseController');
const { verifyToken, authorize } = require('../middleware/verifyToken');

const router = express.Router();

router.post('/', verifyToken, authorize(["ACCOUNTANT", "SCHOOL_ADMIN"]), createExpenseController);
router.get('/', verifyToken, authorize(["ACCOUNTANT", "SCHOOL_ADMIN"]), getAllExpensesController);
router.get('/:id', verifyToken, authorize(["ACCOUNTANT", "SCHOOL_ADMIN"]), getExpenseByIdController);
router.put('/:id', verifyToken, authorize(["ACCOUNTANT", "SCHOOL_ADMIN"]), updateExpenseController);

module.exports = router;