const express = require('express');
const response = require('../utils/response');
const { pool } = require('../config/db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const [items] = await pool.execute('SELECT * FROM items WHERE stock > 0');
    return response.success(res, items);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [items] = await pool.execute('SELECT * FROM items WHERE item_id = ?', [req.params.id]);
    if (items.length === 0) {
      return response.fail(res, 'Item not found', 404);
    }
    return response.success(res, items[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
