const express = require('express');
const router = express.Router();

const { createUser, login, loginWithSchoolSlug } = require('../controllers/authController');

router.post('/register', createUser);
router.post('/login', login);
router.post('/:slug/login', loginWithSchoolSlug);

module.exports = router;