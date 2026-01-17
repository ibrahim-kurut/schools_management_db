const express = require('express');
const router = express.Router();
const { addMemberController } = require('../controllers/schoolUserController');
const { verifyToken, authorize } = require('../middleware/verifyToken');



router.post('/add-member', verifyToken, authorize(['SCHOOL_ADMIN']), addMemberController);


module.exports = router;