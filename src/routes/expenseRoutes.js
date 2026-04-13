const express = require('express');
const { createExpenseController, getAllExpensesController, getExpenseByIdController, updateExpenseController, deleteExpenseController } = require('../controllers/expenseController');
const { verifyToken, authorize } = require('../middleware/verifyToken');
const requireFeature = require("../middleware/checkFeature.middleware");

const router = express.Router();

router.post('/', verifyToken, authorize(["ACCOUNTANT", "SCHOOL_ADMIN"]), requireFeature('hasFinancials'), createExpenseController);
router.get('/', verifyToken, authorize(["ACCOUNTANT", "SCHOOL_ADMIN"]), requireFeature('hasFinancials'), getAllExpensesController);
router.get('/:id', verifyToken, authorize(["ACCOUNTANT", "SCHOOL_ADMIN"]), requireFeature('hasFinancials'), getExpenseByIdController);
router.put('/:id', verifyToken, authorize(["ACCOUNTANT", "SCHOOL_ADMIN"]), requireFeature('hasFinancials'), updateExpenseController);
router.delete('/:id', verifyToken, authorize(["ACCOUNTANT", "SCHOOL_ADMIN"]), requireFeature('hasFinancials'), deleteExpenseController);

module.exports = router;