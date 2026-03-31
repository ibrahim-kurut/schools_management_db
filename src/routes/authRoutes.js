const express = require('express');
const router = express.Router();

const { createUser, login, loginWithSchoolSlug, logout } = require('../controllers/authController');
const upload = require('../middleware/upload');

// Register — image field is optional (multipart/form-data or JSON both work)
router.post('/register', upload.single('image'), createUser);
router.post('/login', login);
router.post('/:slug/login', loginWithSchoolSlug);
router.post('/logout', logout);

module.exports = router;