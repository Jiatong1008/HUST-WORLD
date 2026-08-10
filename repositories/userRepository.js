const { pool } = require('../config/db');

const createUser = async ({ username, password, email }) => {
  const [result] = await pool.execute(
    'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
    [username, password, email]
  );
  return result.insertId;
};

const findByUsername = async (username) => {
  const [users] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
  return users[0] || null;
};

const findById = async (userId) => {
  const [users] = await pool.execute('SELECT username, email FROM users WHERE user_id = ?', [userId]);
  return users[0] || null;
};

const updateLastLogin = async (userId) => {
  await pool.execute('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?', [userId]);
};

module.exports = { createUser, findByUsername, findById, updateLastLogin };
