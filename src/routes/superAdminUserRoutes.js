const express = require('express');
const router = express.Router();
const { getAllUsers, updateUser, deleteUser } = require('../controllers/superAdminUserController');
const { verifyTokenAndSuperAdmin } = require('../middleware/verifyToken');

// All routes here are protected and require SUPER_ADMIN role
router.use(verifyTokenAndSuperAdmin);

router.get('/', getAllUsers);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
