const express = require('express');
const router = express.Router();
const { signup, login, protectedTest, authMiddleware } = require('../controllers/authController');

// Public routes
router.post('/signup', signup);
router.post('/login', login);

// Protected route
router.get('/me', authMiddleware, protectedTest);

module.exports = router;