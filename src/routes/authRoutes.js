const express = require('express');
const router = express.Router();

const { createUser, login, loginWithSchoolSlug, logout } = require('../controllers/authController');
const upload = require('../middleware/upload');
const { authLimiter } = require('../middleware/rateLimiter');

// Register — image field is optional (multipart/form-data or JSON both work)
router.post('/register', upload.single('image'), createUser);
router.post('/login', authLimiter, login);
router.post('/:slug/login', authLimiter, loginWithSchoolSlug);
router.post('/logout', logout);

module.exports = router;