const express = require('express');
const router = express.Router();

const { createPlan, getAllPlans } = require('../controllers/planController');
const { authorize, verifyToken } = require('../middleware/verifyToken');

router.post('/', verifyToken, authorize("SUPER_ADMIN"), createPlan);
router.get('/', verifyToken, authorize(["SUPER_ADMIN", "SCHOOL_ADMIN"]), getAllPlans);

module.exports = router;