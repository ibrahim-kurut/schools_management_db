const express = require('express');
const { createExpenseController, getAllExpensesController } = require('../controllers/expenseController');
const { verifyToken, authorize } = require('../middleware/verifyToken');

const router = express.Router();

router.post('/', verifyToken, authorize(["ACCOUNTANT", "SCHOOL_ADMIN"]), createExpenseController);
router.get('/', verifyToken, authorize(["ACCOUNTANT", "SCHOOL_ADMIN"]), getAllExpensesController);

module.exports = router;