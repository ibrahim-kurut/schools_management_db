const express = require('express');
const router = express.Router();

const { createPlan, getAllPlans, getPlanById, updatePlanById } = require('../controllers/planController');
const { authorize, verifyToken } = require('../middleware/verifyToken');

router.post('/', verifyToken, authorize("SUPER_ADMIN"), createPlan);
router.get('/', verifyToken, authorize(["SUPER_ADMIN", "SCHOOL_ADMIN"]), getAllPlans);
router.get('/:id', verifyToken, authorize(["SUPER_ADMIN", "SCHOOL_ADMIN"]), getPlanById);
router.put('/:id', verifyToken, authorize("SUPER_ADMIN"), updatePlanById);

module.exports = router;