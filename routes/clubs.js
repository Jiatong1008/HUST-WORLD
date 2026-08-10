const express = require('express');
const response = require('../utils/response');
const { pool } = require('../config/db');

const router = express.Router();

function isClubRecruitmentTime(gameTime) {
  if (!gameTime) return false;
  const isFreshmanRecruitment = gameTime.semester === 1 && gameTime.week <= 2 && gameTime.grade === 1;
  const isSophomoreRecruitment = gameTime.semester === 1 && gameTime.week >= 5 && gameTime.week <= 6 && gameTime.grade === 2;
  return isFreshmanRecruitment || isSophomoreRecruitment;
}

function canAcceptTaskByGrade(characterGrade, gradeLimit) {
  if (!gradeLimit) return true;
  return characterGrade >= gradeLimit;
}

async function getCharacterGrade(characterId) {
  const [characters] = await pool.execute('SELECT grade FROM characters WHERE character_id = ?', [characterId]);
  return characters.length > 0 ? characters[0].grade : 1;
}

router.get('/', async (req, res, next) => {
  try {
    const [clubs] = await pool.execute(`
      SELECT c.*, n.npc_id, n.npc_name, n.npc_type, n.map_id, n.x_coordinate, n.y_coordinate, n.dialogue, n.npc_function
      FROM clubs c
      LEFT JOIN npcs n ON c.npc_id = n.npc_id
      ORDER BY c.club_id
    `);
    return response.success(res, clubs);
  } catch (error) {
    next(error);
  }
});

router.get('/type/:type', async (req, res, next) => {
  try {
    const [clubs] = await pool.execute('SELECT * FROM clubs WHERE club_type = ?', [req.params.type]);
    return response.success(res, clubs);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const [clubs] = await pool.execute(`
      SELECT c.*, n.npc_id, n.npc_name, n.npc_type, n.map_id, n.x_coordinate, n.y_coordinate, n.dialogue, n.npc_function
      FROM clubs c
      LEFT JOIN npcs n ON c.npc_id = n.npc_id
      WHERE c.club_id = ?
    `, [req.params.id]);
    if (clubs.length === 0) {
      return response.fail(res, 'Club not found', 404);
    }
    return response.success(res, clubs[0]);
  } catch (error) {
    next(error);
  }
});

router.post('/join', async (req, res, next) => {
  try {
    const { characterId, clubId, gameTime } = req.body;

    if (!isClubRecruitmentTime(gameTime)) {
      return response.fail(res, {
        error: '现在不是百团大战时期！',
        canJoin: false,
        message: '百团大战在军训结束后和大二第一学期一个月后举行'
      }, 403);
    }

    const [existingMembership] = await pool.execute(
      'SELECT * FROM character_clubs WHERE character_id = ? AND club_id = ? AND status IN ("active", "quit")',
      [characterId, clubId]
    );

    if (existingMembership.length > 0) {
      const membership = existingMembership[0];
      if (membership.status === 'active') {
        return response.fail(res, 'Already a member of this club', 400);
      }
      if (membership.quit_at && membership.status === 'quit') {
        return response.fail(res, {
          error: '退出社团后需要等待下一个百团大战才能重新加入',
          canJoin: false
        }, 403);
      }
    }

    const [result] = await pool.execute(
      'INSERT INTO character_clubs (character_id, club_id, status) VALUES (?, ?, "active")',
      [characterId, clubId]
    );

    return response.success(res, { characterClubId: result.insertId, canJoin: true }, 'Joined club successfully', 201);
  } catch (error) {
    next(error);
  }
});

router.post('/quit', async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { characterClubId, reason = 'quit' } = req.body;

    const [memberships] = await connection.execute('SELECT * FROM character_clubs WHERE character_club_id = ?', [characterClubId]);
    if (memberships.length === 0) {
      await connection.rollback();
      return response.fail(res, 'Membership not found', 404);
    }

    const membership = memberships[0];
    await connection.execute(
      'UPDATE character_clubs SET status = "quit", quit_at = NOW(), exit_reason = ? WHERE character_club_id = ?',
      [reason, characterClubId]
    );
    await connection.execute('DELETE FROM character_club_tasks WHERE character_id = ?', [membership.character_id]);
    await connection.commit();

    return response.success(res, { affectedRows: 1 }, 'Left club successfully and cleared all task progress');
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

router.get('/character/:characterId', async (req, res, next) => {
  try {
    const [memberships] = await pool.execute(`
      SELECT cc.*, c.club_name, c.club_icon, c.club_type, c.description
      FROM character_clubs cc
      JOIN clubs c ON cc.club_id = c.club_id
      WHERE cc.character_id = ? AND cc.status = "active"
    `, [req.params.characterId]);
    return response.success(res, memberships);
  } catch (error) {
    next(error);
  }
});

router.get('/:clubId/tasks', async (req, res, next) => {
  try {
    const { characterId } = req.query;
    const clubId = req.params.clubId;
    let tasks;

    if (characterId) {
      const characterGrade = await getCharacterGrade(characterId);
      const [allTasks] = await pool.execute('SELECT * FROM club_tasks WHERE club_id = ? ORDER BY task_type, difficulty', [clubId]);
      tasks = allTasks.map(task => ({
        ...task,
        canAccept: canAcceptTaskByGrade(characterGrade, task.grade_limit),
        gradeRequired: task.grade_limit || null
      }));
    } else {
      [tasks] = await pool.execute('SELECT * FROM club_tasks WHERE club_id = ? ORDER BY task_type, difficulty', [clubId]);
    }

    return response.success(res, tasks);
  } catch (error) {
    next(error);
  }
});

router.get('/character/:characterId/tasks', async (req, res, next) => {
  try {
    const [characterTasks] = await pool.execute(`
      SELECT cct.*, ct.task_name, ct.description, ct.task_type, ct.difficulty, ct.reward, ct.grade_limit, c.club_id, c.club_name, c.club_icon
      FROM character_club_tasks cct
      JOIN club_tasks ct ON cct.club_task_id = ct.club_task_id
      JOIN clubs c ON ct.club_id = c.club_id
      WHERE cct.character_id = ?
    `, [req.params.characterId]);
    return response.success(res, characterTasks);
  } catch (error) {
    next(error);
  }
});

router.post('/tasks/accept', async (req, res, next) => {
  try {
    const { characterId, clubTaskId } = req.body;

    const [existing] = await pool.execute('SELECT * FROM character_club_tasks WHERE character_id = ? AND club_task_id = ?', [characterId, clubTaskId]);
    if (existing.length > 0) {
      return response.fail(res, 'Already accepted this task', 400);
    }

    const [tasks] = await pool.execute('SELECT * FROM club_tasks WHERE club_task_id = ?', [clubTaskId]);
    if (tasks.length === 0) {
      return response.fail(res, 'Task not found', 404);
    }

    const task = tasks[0];
    const characterGrade = await getCharacterGrade(characterId);
    if (!canAcceptTaskByGrade(characterGrade, task.grade_limit)) {
      return response.fail(res, {
        error: `该任务需要${task.grade_limit}年级以上才能接取`,
        currentGrade: characterGrade,
        requiredGrade: task.grade_limit
      }, 403);
    }

    const [result] = await pool.execute('INSERT INTO character_club_tasks (character_id, club_task_id) VALUES (?, ?)', [characterId, clubTaskId]);
    return response.success(res, { characterClubTaskId: result.insertId }, 'Task accepted', 201);
  } catch (error) {
    next(error);
  }
});

router.put('/tasks/complete', async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { characterClubTaskId } = req.body;

    const [characterTasks] = await connection.execute('SELECT * FROM character_club_tasks WHERE character_club_task_id = ?', [characterClubTaskId]);
    if (characterTasks.length === 0) {
      await connection.rollback();
      return response.fail(res, 'Character club task not found', 404);
    }

    const characterTask = characterTasks[0];
    const [clubTasks] = await connection.execute('SELECT * FROM club_tasks WHERE club_task_id = ?', [characterTask.club_task_id]);
    if (clubTasks.length === 0) {
      await connection.rollback();
      return response.fail(res, 'Club task not found', 404);
    }

    const clubTask = clubTasks[0];
    const reward = typeof clubTask.reward === 'string' ? JSON.parse(clubTask.reward) : clubTask.reward;

    await connection.execute(
      'UPDATE character_club_tasks SET status = "completed", completed_at = CURRENT_TIMESTAMP WHERE character_club_task_id = ?',
      [characterClubTaskId]
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
    return response.success(res, { reward, taskType: clubTask.task_type }, 'Task completed and rewards awarded');
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

router.get('/recruitment/status', async (req, res, next) => {
  try {
    const { gameTime } = req.query;
    const time = typeof gameTime === 'string' ? JSON.parse(gameTime) : gameTime;
    const isRecruitment = isClubRecruitmentTime(time);
    let recruitmentPeriod = null;

    if (isRecruitment) {
      if (time.grade === 1 && time.semester === 1 && time.week <= 2) recruitmentPeriod = 'freshman';
      else if (time.grade === 2 && time.semester === 1 && time.week >= 5 && time.week <= 6) recruitmentPeriod = 'sophomore';
    }

    return response.success(res, {
      isRecruitment,
      recruitmentPeriod,
      message: isRecruitment
        ? (recruitmentPeriod === 'freshman' ? '大一百团大战进行中！' : '大二百团大战进行中！')
        : '百团大战暂未开始'
    });
  } catch (error) {
    next(error);
  }
});

router.get('/npcs/all', async (req, res, next) => {
  try {
    const [npcs] = await pool.execute(`
      SELECT n.*, c.club_id, c.club_name, c.club_type, c.description
      FROM npcs n
      INNER JOIN clubs c ON n.npc_id = c.npc_id
      WHERE n.npc_function = 'club_manager'
      ORDER BY c.club_id
    `);
    return response.success(res, npcs);
  } catch (error) {
    next(error);
  }
});

router.get('/:clubId/npc', async (req, res, next) => {
  try {
    const [npcs] = await pool.execute(`
      SELECT n.*, c.club_id, c.club_name, c.club_type
      FROM npcs n
      INNER JOIN clubs c ON n.npc_id = c.npc_id
      WHERE c.club_id = ? AND n.npc_function = 'club_manager'
    `, [req.params.clubId]);
    if (npcs.length === 0) {
      return response.fail(res, 'Club NPC not found', 404);
    }
    return response.success(res, npcs[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
