const express = require('express');
const router = express.Router();
const { addMemberController, getAllMembersController, getMemberByIdController, updateMemberByIdController, deleteMemberByIdController, checkStudentCodeController, bulkImportStudentsController, downloadTemplateController } = require('../controllers/schoolUserController');
const { verifyToken, authorize } = require('../middleware/verifyToken');
const upload = require('../middleware/upload');
const uploadExcel = require('../middleware/uploadExcel');



router.get('/check-code/:code', verifyToken, authorize(['SCHOOL_ADMIN', 'ASSISTANT']), checkStudentCodeController);

// --- مسارات الرفع الجماعي للطلاب ---
router.post('/import-students', verifyToken, authorize(['SCHOOL_ADMIN', 'ASSISTANT']), uploadExcel.single('file'), bulkImportStudentsController);
router.get('/import-template', verifyToken, authorize(['SCHOOL_ADMIN', 'ASSISTANT']), downloadTemplateController);

router.post('/', verifyToken, authorize(['SCHOOL_ADMIN', 'ASSISTANT']), upload.single('image'), addMemberController);
router.get('/', verifyToken, authorize(['SCHOOL_ADMIN', 'ASSISTANT']), getAllMembersController);
router.get('/:id', verifyToken, authorize(['SCHOOL_ADMIN', 'ASSISTANT']), getMemberByIdController);
router.put('/:id', verifyToken, authorize(['SCHOOL_ADMIN', 'ASSISTANT']), upload.single('image'), updateMemberByIdController);
router.delete('/:id', verifyToken, authorize(['SCHOOL_ADMIN']), deleteMemberByIdController);
module.exports = router