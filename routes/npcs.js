const express = require('express');
const response = require('../utils/response');
const { pool } = require('../config/db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const [npcs] = await pool.execute('SELECT * FROM npcs');
    return response.success(res, npcs);
  } catch (error) {
    next(error);
  }
});

router.get('/type/:type', async (req, res, next) => {
  try {
    const [npcs] = await pool.execute('SELECT * FROM npcs WHERE npc_type = ?', [req.params.type]);
    return response.success(res, npcs);
  } catch (error) {
    next(error);
  }
});

router.get('/map/:mapId', async (req, res, next) => {
  try {
    const [npcs] = await pool.execute('SELECT * FROM npcs WHERE map_id = ?', [req.params.mapId]);
    return response.success(res, npcs);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [npcs] = await pool.execute('SELECT * FROM npcs WHERE npc_id = ?', [req.params.id]);
    if (npcs.length === 0) {
      return response.fail(res, 'NPC not found', 404);
    }
    return response.success(res, npcs[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
