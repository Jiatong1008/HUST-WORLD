const express = require('express');
const response = require('../utils/response');
const authService = require('../services/authService');
const characterService = require('../services/characterService');

const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const { userId } = await authService.register(req.body);
    return response.success(res, { userId }, 'User registered successfully', 201);
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { token, user } = await authService.login(req.body);
    const characters = await characterService.findByUserId(user.user_id);
    return response.success(res, { token, userId: user.user_id, username: user.username, characters });
  } catch (error) {
    next(error);
  }
});

router.get('/verify', async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const { userId } = authService.verifyToken(token);
    const user = await authService.getUserById(userId);
    if (!user) {
      throw Object.assign(new Error('Invalid token'), { statusCode: 401 });
    }
    const characters = await characterService.findByUserId(userId);
    return response.success(res, { userId, username: user.username, characters });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
