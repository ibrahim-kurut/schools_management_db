const express = require('express');
const router = express.Router();
const { addMemberController, getAllMembersController, getMemberByIdController, updateMemberByIdController, deleteMemberByIdController } = require('../controllers/schoolUserController');
const { verifyToken, authorize } = require('../middleware/verifyToken');
const upload = require('../middleware/upload');



router.post('/', verifyToken, authorize(['SCHOOL_ADMIN', 'ASSISTANT']), upload.single('image'), addMemberController);
router.get('/', verifyToken, authorize(['SCHOOL_ADMIN', 'ASSISTANT']), getAllMembersController);
router.get('/:id', verifyToken, authorize(['SCHOOL_ADMIN', 'ASSISTANT']), getMemberByIdController);
router.put('/:id', verifyToken, authorize(['SCHOOL_ADMIN', 'ASSISTANT']), updateMemberByIdController);
router.delete('/:id', verifyToken, authorize(['SCHOOL_ADMIN']), deleteMemberByIdController);
module.exports = router