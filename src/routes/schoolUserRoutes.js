const express = require('express');
const router = express.Router();
const { addMemberController, getAllMembersController, getMemberByIdController } = require('../controllers/schoolUserController');
const { verifyToken, authorize } = require('../middleware/verifyToken');



router.post('/', verifyToken, authorize(['SCHOOL_ADMIN']), addMemberController);
router.get('/', verifyToken, authorize(['SCHOOL_ADMIN', 'ASSISTANT']), getAllMembersController);
router.get('/:id', verifyToken, authorize(['SCHOOL_ADMIN']), getMemberByIdController);

module.exports = router