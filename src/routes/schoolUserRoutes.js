const express = require('express');
const router = express.Router();
const { addMemberController, getAllMembersController, getMemberByIdController, updateMemberByIdController, deleteMemberByIdController, checkStudentCodeController } = require('../controllers/schoolUserController');
const { verifyToken, authorize } = require('../middleware/verifyToken');
const upload = require('../middleware/upload');



router.get('/check-code/:code', verifyToken, authorize(['SCHOOL_ADMIN', 'ASSISTANT']), checkStudentCodeController);
router.post('/', verifyToken, authorize(['SCHOOL_ADMIN', 'ASSISTANT']), upload.single('image'), addMemberController);
router.get('/', verifyToken, authorize(['SCHOOL_ADMIN', 'ASSISTANT']), getAllMembersController);
router.get('/:id', verifyToken, authorize(['SCHOOL_ADMIN', 'ASSISTANT']), getMemberByIdController);
router.put('/:id', verifyToken, authorize(['SCHOOL_ADMIN', 'ASSISTANT']), upload.single('image'), updateMemberByIdController);
router.delete('/:id', verifyToken, authorize(['SCHOOL_ADMIN']), deleteMemberByIdController);
module.exports = router