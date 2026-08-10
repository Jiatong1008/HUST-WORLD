const express = require('express');
const response = require('../utils/response');
const { pool } = require('../config/db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const [maps] = await pool.execute('SELECT * FROM maps');
    return response.success(res, maps);
  } catch (error) {
    next(error);
  }
});

router.get('/type/:type', async (req, res, next) => {
  try {
    const [maps] = await pool.execute('SELECT * FROM maps WHERE map_type = ?', [req.params.type]);
    return response.success(res, maps);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [maps] = await pool.execute('SELECT * FROM maps WHERE map_id = ?', [req.params.id]);
    if (maps.length === 0) {
      return response.fail(res, 'Map not found', 404);
    }
    return response.success(res, maps[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
