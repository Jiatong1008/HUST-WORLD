const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const { initDatabase, pool } = require('../../config/db');
const authService = require('../../services/authService');
const characterService = require('../../services/characterService');
const healthService = require('../../services/healthService');
const runningService = require('../../services/runningService');

const runId = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
const usernamePrefix = 'service_user_';
const username = `${usernamePrefix}${runId}`;
const itemNamePrefix = 'Service Test Item ';
const skillNamePrefix = 'Service Test Skill ';

const results = [];

function pass(message) {
  results.push({ ok: true, message });
  console.log(`[services] PASS ${message}`);
}

function fail(message, error) {
  results.push({ ok: false, message, error: error?.message || String(error) });
  console.error(`[services] FAIL ${message}`);
  if (error) console.error(`           ${error.message || error}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectThrows(fn, expectedStatusCode, message) {
  try {
    await fn();
  } catch (error) {
    assert(error.statusCode === expectedStatusCode, `${message}: expected status ${expectedStatusCode}, got ${error.statusCode}`);
    return error;
  }
  throw new Error(`${message}: expected error`);
}

function placeholders(values) {
  return values.map(() => '?').join(',');
}

async function cleanupByUsernamePrefix(prefix) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [users] = await connection.execute(
      'SELECT user_id FROM users WHERE username LIKE ?',
      [`${prefix}%`]
    );

    if (users.length === 0) {
      await connection.commit();
      return 0;
    }

    const userIds = users.map(user => user.user_id);
    const userPh = placeholders(userIds);
    const [characters] = await connection.execute(
      `SELECT character_id FROM characters WHERE user_id IN (${userPh})`,
      userIds
    );
    const characterIds = characters.map(character => character.character_id);

    if (characterIds.length > 0) {
      const charPh = placeholders(characterIds);
      await connection.execute(`DELETE FROM campus_runs WHERE character_id IN (${charPh})`, characterIds);
      await connection.execute(`DELETE FROM character_items WHERE character_id IN (${charPh})`, characterIds);
      await connection.execute(`DELETE FROM character_skills WHERE character_id IN (${charPh})`, characterIds);
      await connection.execute(`DELETE FROM character_tasks WHERE character_id IN (${charPh})`, characterIds);
      await connection.execute(`DELETE FROM character_clubs WHERE character_id IN (${charPh})`, characterIds);
      await connection.execute(`DELETE FROM character_club_tasks WHERE character_id IN (${charPh})`, characterIds);
      await connection.execute(`DELETE FROM character_explorations WHERE character_id IN (${charPh})`, characterIds);
      await connection.execute(`DELETE FROM character_elective_courses WHERE character_id IN (${charPh})`, characterIds);
      await connection.execute(`DELETE FROM character_sports_classes WHERE character_id IN (${charPh})`, characterIds);
      await connection.execute(`DELETE FROM character_innovation_projects WHERE character_id IN (${charPh})`, characterIds);
      await connection.execute(`DELETE FROM routines WHERE character_id IN (${charPh})`, characterIds);
      await connection.execute(`DELETE FROM battle_records WHERE character_id IN (${charPh})`, characterIds);
    }

    await connection.execute(`DELETE FROM characters WHERE user_id IN (${userPh})`, userIds);
    await connection.execute(`DELETE FROM users WHERE user_id IN (${userPh})`, userIds);
    await connection.commit();
    return userIds.length;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function cleanupServiceSeeds() {
  await pool.execute('DELETE FROM character_items WHERE item_id IN (SELECT item_id FROM items WHERE item_name LIKE ?)', [`${itemNamePrefix}%`]);
  await pool.execute('DELETE FROM character_skills WHERE skill_id IN (SELECT skill_id FROM skills WHERE skill_name LIKE ?)', [`${skillNamePrefix}%`]);
  await pool.execute('DELETE FROM items WHERE item_name LIKE ?', [`${itemNamePrefix}%`]);
  await pool.execute('DELETE FROM skills WHERE skill_name LIKE ?', [`${skillNamePrefix}%`]);
}

async function cleanup() {
  await cleanupServiceSeeds();
  await cleanupByUsernamePrefix(usernamePrefix);
}

async function createTestItemAndSkill() {
  const [itemResult] = await pool.execute(
    'INSERT INTO items (item_name, item_type, description, effect, price, stock) VALUES (?, ?, ?, ?, ?, ?)',
    [`${itemNamePrefix}${runId}`, 'consumable', 'Service-level test item', JSON.stringify({ stamina: 10 }), 12, 99]
  );
  const [skillResult] = await pool.execute(
    'INSERT INTO skills (skill_name, skill_type, description, effect, required_level) VALUES (?, ?, ?, ?, ?)',
    [`${skillNamePrefix}${runId}`, 'knowledge', 'Service-level test skill', JSON.stringify({ knowledge: 5 }), 1]
  );
  return { itemId: itemResult.insertId, skillId: skillResult.insertId };
}

async function testAuthService() {
  const registered = await authService.register({
    username,
    password: 'ServiceTest123!',
    email: `${username}@example.test`
  });
  assert(registered.userId > 0, 'register should return userId');

  const login = await authService.login({ username, password: 'ServiceTest123!' });
  assert(login.token, 'login should return token');
  assert(login.user.username === username, 'login should return username');

  const decoded = authService.verifyToken(login.token);
  assert(decoded.userId === registered.userId, 'verifyToken should decode userId');

  const user = await authService.getUserById(registered.userId);
  assert(user.username === username, 'getUserById should return created user');

  await expectThrows(
    () => authService.login({ username, password: 'wrong-password' }),
    401,
    'login rejects invalid password'
  );

  pass('authService register/login/verify/getUserById');
  return registered.userId;
}

async function testCharacterService(userId) {
  const created = await characterService.create({
    userId,
    characterName: `ServiceHero${runId}`,
    gender: 'male',
    college: '计算机学院'
  });
  assert(created.characterId > 0, 'create should return characterId');

  const character = await characterService.findById(created.characterId);
  assert(character.character_name === `ServiceHero${runId}`, 'findById should return created character');

  const byUser = await characterService.findByUserId(userId);
  assert(byUser.some(row => row.character_id === created.characterId), 'findByUserId should include created character');

  await characterService.updateCharacterSave(created.characterId, {
    level: 3,
    experience: 240,
    money: 1888,
    physical: 66,
    social: 71,
    knowledge: 82,
    mood: 64,
    current_map_id: 1,
    position_x: 123,
    position_y: 456,
    grade: 2,
    semester: 3,
    week: 8,
    user_id: 999999,
    game_progress: {
      phase: 'service-test',
      quests: { freshman_arrival: 'COMPLETED' }
    }
  });

  const save = await characterService.getCharacterSave(created.characterId);
  assert(save.level === 3, 'save level should be updated');
  assert(save.money === 1888, 'save money should be updated');
  assert(save.mood === 64, 'save mood should be updated');
  assert(save.position_x === 123 && save.position_y === 456, 'save position should be updated');
  assert(save.user_id === userId, 'forbidden user_id should not be updated');
  assert(save.game_progress?.phase === 'service-test', 'game_progress should round-trip as object');
  assert(save.last_saved_at, 'last_saved_at should be set after save update');

  await characterService.resetCharacterSave(created.characterId);
  const reset = await characterService.getCharacterSave(created.characterId);
  assert(reset.level === 1, 'reset should restore level');
  assert(reset.money === 1000, 'reset should restore money');
  assert(reset.mood === 50, 'reset should restore mood');
  assert(reset.game_progress === null, 'reset should clear game_progress');

  await expectThrows(
    () => characterService.findById(999999999),
    404,
    'findById rejects missing character'
  );

  pass('characterService create/find/save/reset');
  return created.characterId;
}

async function testInventoryAndSkillServices(characterId) {
  const { itemId, skillId } = await createTestItemAndSkill();

  const item = await characterService.addItem(characterId, itemId, 2);
  assert(item.characterItemId > 0, 'addItem should return characterItemId');
  const items = await characterService.findItems(characterId);
  assert(items.some(row => row.item_id === itemId && row.quantity === 2), 'findItems should include added item');

  const skill = await characterService.addSkill(characterId, skillId);
  assert(skill.characterSkillId > 0, 'addSkill should return characterSkillId');
  const skills = await characterService.findSkills(characterId);
  assert(skills.some(row => row.skill_id === skillId), 'findSkills should include added skill');

  pass('characterService item/skill association');
}

async function testRunningService(characterId) {
  await expectThrows(
    () => runningService.recordRun({ characterId, semester: 1, distance: 1600 }),
    400,
    'recordRun rejects missing duration'
  );

  const firstRun = await runningService.recordRun({
    characterId,
    semester: 1,
    distance: 1600,
    duration: 520
  });
  assert(firstRun.runId > 0, 'recordRun should return runId');

  await runningService.recordRun({
    characterId,
    semester: 1,
    distance: 2000,
    duration: 650,
    status: 'failed'
  });

  const runs = await runningService.getRuns(characterId);
  assert(runs.length >= 2, 'getRuns should return recorded runs');

  const stats = await runningService.getStats(characterId);
  assert(Number(stats.totalRuns) >= 2, 'stats should count total runs');
  assert(Number(stats.successfulRuns) >= 1, 'stats should count successful runs');
  assert(Number(stats.averageDistance) > 0, 'stats should include average distance');
  assert(Number(stats.averageDuration) > 0, 'stats should include average duration');

  pass('runningService record/getRuns/getStats');
}

async function testHealthService() {
  const health = await healthService.checkHealth();
  assert(health.service === 'HUST WORLD', 'health service name should match');
  assert(health.status === 'ok', 'health status should be ok');
  assert(health.database === 'ok', 'health database should be ok');
  assert(health.timestamp, 'health should include timestamp');
  pass('healthService database health check');
}

async function run() {
  console.log('[services] HUST WORLD service-level tests starting...');
  console.log(`[services] DB: ${process.env.DB_HOST || 'localhost'} / ${process.env.DB_NAME || 'hust_world'}`);

  try {
    await initDatabase();
    await cleanup();

    const userId = await testAuthService();
    const characterId = await testCharacterService(userId);
    await testInventoryAndSkillServices(characterId);
    await testRunningService(characterId);
    await testHealthService();
  } catch (error) {
    fail('service-level test run', error);
  } finally {
    try {
      await cleanup();
    } catch (error) {
      fail('cleanup service-level test data', error);
    }
    await pool.end();
  }

  const passed = results.filter(result => result.ok).length;
  const failed = results.length - passed;
  console.log(`[services] Summary: ${passed}/${results.length} checks passed`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

run();
