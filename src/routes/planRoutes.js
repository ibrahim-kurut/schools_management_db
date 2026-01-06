const express = require('express');
const router = express.Router();

const { createPlan } = require('../controllers/planController');
const { authorize, verifyToken } = require('../middleware/verifyToken');

router.post('/', verifyToken, authorize("SUPER_ADMIN"), createPlan);

module.exports = router;