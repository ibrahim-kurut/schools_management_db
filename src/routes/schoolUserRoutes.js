const express = require('express');
const router = express.Router();
const { addMemberController, getAllMembersController } = require('../controllers/schoolUserController');
const { verifyToken, authorize } = require('../middleware/verifyToken');



router.post('/', verifyToken, authorize(['SCHOOL_ADMIN']), addMemberController);
router.get('/', verifyToken, authorize(['SCHOOL_ADMIN']), getAllMembersController);


module.exports = router