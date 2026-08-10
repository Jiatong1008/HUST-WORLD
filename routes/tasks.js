const express = require('express');
const response = require('../utils/response');
const { pool } = require('../config/db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const [tasks] = await pool.execute('SELECT * FROM tasks WHERE is_active = TRUE');
    return response.success(res, tasks);
  } catch (error) {
    next(error);
  }
});

router.get('/character/:characterId', async (req, res, next) => {
  try {
    const [characterTasks] = await pool.execute(`
      SELECT ct.*, t.task_name, t.task_type, t.description, t.reward, t.difficulty
      FROM character_tasks ct
      JOIN tasks t ON ct.task_id = t.task_id
      WHERE ct.character_id = ?
    `, [req.params.characterId]);
    return response.success(res, characterTasks);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [tasks] = await pool.execute('SELECT * FROM tasks WHERE task_id = ?', [req.params.id]);
    if (tasks.length === 0) {
      return response.fail(res, 'Task not found', 404);
    }
    return response.success(res, tasks[0]);
  } catch (error) {
    next(error);
  }
});

router.post('/accept', async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { characterId, taskId } = req.body;

    const [existing] = await connection.execute(
      'SELECT * FROM character_tasks WHERE character_id = ? AND task_id = ?',
      [characterId, taskId]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return response.fail(res, 'Already accepted this task', 400);
    }

    const [result] = await connection.execute(
      'INSERT INTO character_tasks (character_id, task_id, status) VALUES (?, ?, "accepted")',
      [characterId, taskId]
    );

    await connection.commit();
    return response.success(res, { characterTaskId: result.insertId }, 'Task accepted', 201);
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

router.put('/complete', async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { characterTaskId } = req.body;

    const [characterTasks] = await connection.execute(
      'SELECT * FROM character_tasks WHERE character_task_id = ?',
      [characterTaskId]
    );

    if (characterTasks.length === 0) {
      await connection.rollback();
      return response.fail(res, 'Character task not found', 404);
    }

    const characterTask = characterTasks[0];
    const [tasks] = await connection.execute('SELECT * FROM tasks WHERE task_id = ?', [characterTask.task_id]);
    if (tasks.length === 0) {
      await connection.rollback();
      return response.fail(res, 'Task not found', 404);
    }

    const task = tasks[0];
    const reward = typeof task.reward === 'string' ? JSON.parse(task.reward) : task.reward;

    await connection.execute(
      'UPDATE character_tasks SET status = "completed", completed_at = CURRENT_TIMESTAMP WHERE character_task_id = ?',
      [characterTaskId]
    );

    let updateQuery = 'UPDATE characters SET ';
    const updateParams = [];

    if (reward.money) { updateQuery += 'money = money + ?, '; updateParams.push(reward.money); }
    if (reward.experience) { updateQuery += 'experience = experience + ?, '; updateParams.push(reward.experience); }
    if (reward.social) { updateQuery += 'social = social + ?, '; updateParams.push(reward.social); }
    if (reward.physical) { updateQuery += 'physical = physical + ?, '; updateParams.push(reward.physical); }

    if (updateParams.length > 0) {
      updateQuery = updateQuery.slice(0, -2) + ' WHERE character_id = ?';
      updateParams.push(characterTask.character_id);
      await connection.execute(updateQuery, updateParams);
    }

    await connection.commit();
    return response.success(res, { reward }, 'Task completed and rewards awarded');
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

module.exports = router;
