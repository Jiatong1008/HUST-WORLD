const { pool } = require('../config/db');

const SAVE_FIELDS = [
  'level', 'experience', 'money', 'physical', 'social', 'knowledge', 'mood',
  'current_map_id', 'position_x', 'position_y', 'grade', 'semester', 'week',
  'game_progress'
];

const create = async ({ userId, characterName, gender, college }) => {
  const [result] = await pool.execute(
    'INSERT INTO characters (user_id, character_name, gender, college) VALUES (?, ?, ?, ?)',
    [userId, characterName, gender, college]
  );
  return result.insertId;
};

const findByUserId = async (userId) => {
  const [characters] = await pool.execute('SELECT * FROM characters WHERE user_id = ?', [userId]);
  return characters;
};

const findById = async (id) => {
  const [characters] = await pool.execute('SELECT * FROM characters WHERE character_id = ?', [id]);
  return characters[0] || null;
};

const update = async (id, fields) => {
  const {
    level, experience, money, physical, social, knowledge,
    gameProgress, grade, semester, week
  } = fields;
  const [result] = await pool.execute(
    `UPDATE characters
     SET level = ?, experience = ?, money = ?, physical = ?, social = ?, knowledge = ?,
         game_progress = ?, grade = ?, semester = ?, week = ?
     WHERE character_id = ?`,
    [level, experience, money, physical, social, knowledge,
     JSON.stringify(gameProgress), grade, semester, week, id]
  );
  return result.affectedRows;
};

const getSave = async (id) => {
  const [characters] = await pool.execute(
    `SELECT character_id, user_id, character_name, gender, college,
            grade, semester, week, level, experience, money,
            physical, social, knowledge, mood,
            current_map_id, position_x, position_y,
            game_progress, created_at, updated_at, last_saved_at
     FROM characters WHERE character_id = ?`,
    [id]
  );
  return characters[0] || null;
};

const updateSave = async (id, fields) => {
  const updates = [];
  const values = [];

  for (const key of SAVE_FIELDS) {
    if (fields[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(key === 'game_progress' ? JSON.stringify(fields[key]) : fields[key]);
    }
  }

  if (updates.length === 0) {
    return 0;
  }

  updates.push('last_saved_at = CURRENT_TIMESTAMP');
  values.push(id);

  const [result] = await pool.execute(
    `UPDATE characters SET ${updates.join(', ')} WHERE character_id = ?`,
    values
  );
  return result.affectedRows;
};

const resetSave = async (id) => {
  const [result] = await pool.execute(
    `UPDATE characters
     SET level = 1, experience = 0, money = 1000,
         physical = 50, social = 50, knowledge = 50, mood = 50,
         current_map_id = NULL, position_x = 0, position_y = 0,
         grade = 1, semester = 1, week = 1,
         game_progress = NULL, last_saved_at = CURRENT_TIMESTAMP
     WHERE character_id = ?`,
    [id]
  );
  return result.affectedRows;
};

const updateLastSavedAt = async (id) => {
  const [result] = await pool.execute(
    'UPDATE characters SET last_saved_at = CURRENT_TIMESTAMP WHERE character_id = ?',
    [id]
  );
  return result.affectedRows;
};

const addItem = async (characterId, itemId, quantity) => {
  const [result] = await pool.execute(
    'INSERT INTO character_items (character_id, item_id, quantity) VALUES (?, ?, ?)',
    [characterId, itemId, quantity || 1]
  );
  return result.insertId;
};

const findItems = async (characterId) => {
  const [items] = await pool.execute(`
    SELECT ci.*, i.item_name, i.item_type, i.description, i.effect, i.price
    FROM character_items ci
    JOIN items i ON ci.item_id = i.item_id
    WHERE ci.character_id = ?
  `, [characterId]);
  return items;
};

const addSkill = async (characterId, skillId) => {
  const [result] = await pool.execute(
    'INSERT INTO character_skills (character_id, skill_id) VALUES (?, ?)',
    [characterId, skillId]
  );
  return result.insertId;
};

const findSkills = async (characterId) => {
  const [skills] = await pool.execute(`
    SELECT cs.*, s.skill_name, s.skill_type, s.description, s.effect
    FROM character_skills cs
    JOIN skills s ON cs.skill_id = s.skill_id
    WHERE cs.character_id = ?
  `, [characterId]);
  return skills;
};

module.exports = {
  create, findByUserId, findById, update, getSave, updateSave, resetSave, updateLastSavedAt,
  addItem, findItems, addSkill, findSkills
};
