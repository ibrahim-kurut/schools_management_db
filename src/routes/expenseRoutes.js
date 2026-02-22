const express = require('express');
const { createExpenseController } = require('../controllers/expenseController');
const { verifyToken, authorize } = require('../middleware/verifyToken');

const router = express.Router();

router.post('/', verifyToken, authorize(["ACCOUNTANT", "SCHOOL_ADMIN"]), createExpenseController);

module.exports = router;