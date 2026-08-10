const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');

const JWT_SECRET = process.env.JWT_SECRET || 'hust-world-secret-key-2024';
const SALT_ROUNDS = 10;

const register = async ({ username, password, email }) => {
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const userId = await userRepository.createUser({ username, password: hashedPassword, email });
  return { userId };
};

const login = async ({ username, password }) => {
  const user = await userRepository.findByUsername(username);
  if (!user) {
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  }
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  }
  const token = jwt.sign({ userId: user.user_id }, JWT_SECRET, { expiresIn: '24h' });
  await userRepository.updateLastLogin(user.user_id);
  return { token, user: { user_id: user.user_id, username: user.username } };
};

const verifyToken = (token) => {
  if (!token) {
    throw Object.assign(new Error('No token provided'), { statusCode: 401 });
  }
  return jwt.verify(token, JWT_SECRET);
};

const getUserById = async (userId) => {
  return await userRepository.findById(userId);
};

module.exports = { register, login, verifyToken, getUserById };
