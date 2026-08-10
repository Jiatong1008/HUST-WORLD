const express = require('express');
const response = require('../utils/response');
const { pool } = require('../config/db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const [explorations] = await pool.execute('SELECT * FROM campus_exploration');
    return response.success(res, explorations);
  } catch (error) {
    next(error);
  }
});

router.get('/campus', async (req, res, next) => {
  try {
    const [explorations] = await pool.execute(`
      SELECT e.*, m.map_name, m.x_coordinate, m.y_coordinate
      FROM campus_exploration e
      JOIN maps m ON e.map_id = m.map_id
    `);
    return response.success(res, explorations);
  } catch (error) {
    next(error);
  }
});

router.get('/character/:characterId', async (req, res, next) => {
  try {
    const [characterExplorations] = await pool.execute(`
      SELECT ce.*, e.map_id, e.exploration_type, e.description, e.reward
      FROM character_explorations ce
      JOIN campus_exploration e ON ce.exploration_id = e.exploration_id
      WHERE ce.character_id = ?
    `, [req.params.characterId]);
    return response.success(res, characterExplorations);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [explorations] = await pool.execute('SELECT * FROM campus_exploration WHERE exploration_id = ?', [req.params.id]);
    if (explorations.length === 0) {
      return response.fail(res, 'Exploration not found', 404);
    }
    return response.success(res, explorations[0]);
  } catch (error) {
    next(error);
  }
});

router.post('/complete', async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { characterId, explorationId } = req.body;

    const [existing] = await connection.execute(
      'SELECT * FROM character_explorations WHERE character_id = ? AND exploration_id = ?',
      [characterId, explorationId]
    );

    if (existing.length > 0 && existing[0].status === 'completed') {
      await connection.rollback();
      return response.fail(res, 'Exploration already completed', 400);
    }

    if (existing.length > 0) {
      await connection.execute(
        'UPDATE character_explorations SET status = "completed", completed_at = CURRENT_TIMESTAMP WHERE character_id = ? AND exploration_id = ?',
        [characterId, explorationId]
      );
    } else {
      await connection.execute(
        'INSERT INTO character_explorations (character_id, exploration_id, status, completed_at) VALUES (?, ?, "completed", CURRENT_TIMESTAMP)',
        [characterId, explorationId]
      );
    }

    const [explorations] = await connection.execute('SELECT * FROM campus_exploration WHERE exploration_id = ?', [explorationId]);
    const exploration = explorations[0];
    const reward = typeof exploration.reward === 'string' ? JSON.parse(exploration.reward) : exploration.reward;

    if (reward) {
      let updateQuery = 'UPDATE characters SET ';
      const updateParams = [];
      if (reward.money) { updateQuery += 'money = money + ?, '; updateParams.push(reward.money); }
      if (reward.experience) { updateQuery += 'experience = experience + ?, '; updateParams.push(reward.experience); }
      if (updateParams.length > 0) {
        updateQuery = updateQuery.slice(0, -2) + ' WHERE character_id = ?';
        updateParams.push(characterId);
        await connection.execute(updateQuery, updateParams);
      }
    }

    await connection.commit();
    return response.success(res, { reward }, 'Exploration completed');
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

module.exports = router;
