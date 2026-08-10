const jwt = require('jsonwebtoken');
const response = require('../utils/response');

const JWT_SECRET = process.env.JWT_SECRET || 'hust-world-secret-key-2024';

const authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return response.fail(res, 'No token provided', 401);
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return response.fail(res, 'Invalid token', 401);
  }
};

const optionalAuthenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.userId = decoded.userId;
    }
    next();
  } catch (error) {
    return response.fail(res, 'Invalid token', 401);
  }
};

module.exports = { authenticate, optionalAuthenticate };
