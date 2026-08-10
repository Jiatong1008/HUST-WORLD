const response = require('../utils/response');
const { logger } = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error('Request failed', {
    method: req.method,
    path: req.originalUrl || req.path,
    statusCode: err.statusCode || 500,
    code: err.code,
    name: err.name,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });

  if (err.statusCode) {
    return response.fail(res, err.message, err.statusCode);
  }

  if (err.name === 'UnauthorizedError') {
    return response.fail(res, '未授权，请重新登录', 401);
  }

  if (err.name === 'ValidationError') {
    return response.fail(res, err.message, 400);
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return response.fail(res, '数据已存在', 409);
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return response.fail(res, '关联数据不存在', 400);
  }

  return response.error(res, err.message || '服务器内部错误');
};

// 处理 404 路由
const notFoundHandler = (req, res) => {
  return response.fail(res, `接口不存在: ${req.method} ${req.path}`, 404);
};

module.exports = { errorHandler, notFoundHandler };
