const express = require('express');
const router = express.Router();
const response = require('../utils/response');
const { initializeData } = require('../services/initService');

router.get('/', async (req, res, next) => {
  try {
    const data = await initializeData();
    return response.success(res, data, '数据库初始化完成');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
