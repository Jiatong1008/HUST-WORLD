const { pool } = require('../config/db');

async function createRun(characterId, semester, distance, duration, status = 'completed') {
  const [result] = await pool.execute(
    `INSERT INTO campus_runs (character_id, semester, run_date, distance, duration, status)
     VALUES (?, ?, CURDATE(), ?, ?, ?)`,
    [characterId, semester, distance, duration, status]
  );
  return result.insertId;
}

async function getRuns(characterId, year, semester) {
  let query = 'SELECT * FROM campus_runs WHERE character_id = ?';
  const params = [characterId];

  if (year && semester) {
    query += ' AND YEAR(run_date) = ? AND semester = ?';
    params.push(year, semester);
  }

  query += ' ORDER BY run_date DESC';

  const [records] = await pool.execute(query, params);
  return records;
}

async function getStats(characterId, year, semester) {
  let whereClause = 'WHERE character_id = ?';
  const params = [characterId];

  if (year && semester) {
    whereClause += ' AND YEAR(run_date) = ? AND semester = ?';
    params.push(year, semester);
  }

  const [[countResult]] = await pool.execute(
    `SELECT COUNT(*) as total_runs FROM campus_runs ${whereClause}`,
    params
  );

  const [[successResult]] = await pool.execute(
    `SELECT COUNT(*) as successful_runs FROM campus_runs ${whereClause} AND status = 'completed'`,
    params
  );

  const [[avgResult]] = await pool.execute(
    `SELECT AVG(distance) as avg_distance, AVG(duration) as avg_duration FROM campus_runs ${whereClause}`,
    params
  );

  return {
    totalRuns: countResult.total_runs,
    successfulRuns: successResult.successful_runs,
    averageDistance: avgResult.avg_distance || 0,
    averageDuration: avgResult.avg_duration || 0
  };
}

module.exports = { createRun, getRuns, getStats };
