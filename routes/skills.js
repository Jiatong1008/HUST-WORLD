const express = require('express');
const response = require('../utils/response');
const { pool } = require('../config/db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const [skills] = await pool.execute('SELECT * FROM skills');
    return response.success(res, skills);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [skills] = await pool.execute('SELECT * FROM skills WHERE skill_id = ?', [req.params.id]);
    if (skills.length === 0) {
      return response.fail(res, 'Skill not found', 404);
    }
    return response.success(res, skills[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
