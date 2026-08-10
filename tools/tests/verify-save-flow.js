/**
 * HUST WORLD 游客/登录/存档流程验证脚本
 * 模拟浏览器 localStorage 与全局 API，测试 SaveManager 在两种模式下的行为。
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const PORT = process.env.PORT || 8080;
const BASE_URL = `http://localhost:${PORT}`;
const API_BASE = `${BASE_URL}/api`;

// 内存 localStorage 模拟
class MemoryLocalStorage {
  constructor() { this.store = new Map(); }
  getItem(key) { return this.store.has(key) ? this.store.get(key) : null; }
  setItem(key, value) { this.store.set(key, String(value)); }
  removeItem(key) { this.store.delete(key); }
  clear() { this.store.clear(); }
}

global.localStorage = new MemoryLocalStorage();
global.__API_BASE__ = API_BASE;

require('../../game/js/core/SessionManager.js');
require('../../game/js/api.js');
require('../../game/js/core/SaveManager.js');

const { sessionManager } = global;
const { saveManager } = global;
const API = global.API;

const http = require('http');

function httpRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { ...headers }
    };
    if (body) {
      const payload = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', () => resolve({ status: 0, body: null }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function assert(name, condition) {
  if (condition) {
    console.log(`  ✅ ${name}`);
  } else {
    console.error(`  ❌ ${name}`);
    process.exitCode = 1;
  }
}

async function cleanupTestUser(username) {
  try {
    await httpRequest('DELETE', `/api/auth/cleanup-test/${username}`, null, {});
  } catch {
    // 忽略，后端可能没有该接口，由 cleanup:smoke 兜底
  }
}

async function runGuestFlow() {
  console.log('\n🧪 游客模式验证');
  global.localStorage.clear();
  if (sessionManager) sessionManager.logout();

  // 写入测试本地存档
  const testSnapshot = {
    version: '1',
    savedAt: new Date().toISOString(),
    mode: 'guest',
    character: {
      characterId: null,
      characterName: '测试游客',
      gender: 'male',
      college: '计算机科学与技术学院',
      level: 2,
      experience: 100,
      money: 2000,
      physical: 60,
      social: 55,
      knowledge: 70,
      mood: 80,
      grade: 1,
      semester: 1,
      week: 3
    },
    gameTime: { day: 2, hour: 10, minute: 0 },
    position: { mapId: 1, x: 100, y: 200 },
    progress: { tutorial: true },
    modules: { clubs: { joined: [1] } },
    settings: { volume: 0.8 }
  };

  saveManager.saveLocal(testSnapshot);
  const loaded = saveManager.loadLocal();
  assert('本地写入后可读取', loaded !== null);
  assert('本地存档角色名正确', loaded?.character?.characterName === '测试游客');
  assert('本地存档模式为 guest', loaded?.mode === 'guest');
  assert('SaveManager 判断为游客模式', !saveManager.isLoggedIn());

  // 旧存档迁移：构造旧 key 后调用迁移
  global.localStorage.setItem('hust_world_character', JSON.stringify({
    characterId: null, name: '旧游客', gender: 'female', college: '管理学院',
    level: 3, money: 3000, x: 50, y: 60, currentMapId: 2
  }));
  global.localStorage.setItem('hust_world_time', JSON.stringify({ day: 5, hour: 8, minute: 0 }));
  global.localStorage.setItem('hust_world_module_clubs', JSON.stringify({ joined: [2] }));
  global.localStorage.setItem('hust_world_module_exploration', JSON.stringify({ count: 3 }));
  // 先清空新 key，确保迁移会触发
  global.localStorage.removeItem('hust_world_save_v1');
  saveManager.migrationAttempted = false;
  const migrated = saveManager.migrateOldSave();
  assert('旧存档迁移成功', migrated !== null);
  assert('旧存档迁移后保留旧数据关键字段', migrated?.character?.characterName === '旧游客');
  assert('旧 key 迁移后已被删除', global.localStorage.getItem('hust_world_character') === null);

  // 游客重置
  await saveManager.reset();
  const afterReset = saveManager.loadLocal();
  assert('游客重置后本地存档仍存在初始快照', afterReset !== null);
  assert('游客重置后角色名恢复为游客', afterReset?.character?.characterName === '游客');

  console.log('  游客流程验证完成');
}

async function runLoginFlow() {
  console.log('\n🔐 登录/注册流程验证');
  global.localStorage.clear();
  if (sessionManager) sessionManager.logout();

  const username = `verify_user_${Date.now()}`;
  const password = '123456';
  const email = `${username}@hust.world`;

  // 注册
  const registerRes = await httpRequest('POST', '/api/auth/register', { username, password, email });
  assert('注册成功', registerRes.status === 201 && registerRes.body?.success === true);
  const userId = registerRes.body?.data?.userId;
  assert('注册返回 userId', !!userId);

  // 登录
  const loginRes = await httpRequest('POST', '/api/auth/login', { username, password });
  assert('登录成功', loginRes.status === 200 && loginRes.body?.success === true);
  const token = loginRes.body?.data?.token;
  const characters = loginRes.body?.data?.characters;
  assert('登录返回 token', !!token);
  assert('登录返回角色数组', Array.isArray(characters));
  assert('新用户无角色', characters.length === 0);

  // 设置 SessionManager 状态（模拟 auth.js login 行为）
  sessionManager.setToken(token);
  sessionManager.setUser({ userId, username });
  sessionManager.setCharacters([]);
  sessionManager.clearCurrentCharacterId();
  assert('token 存在但无角色时为游客模式', !saveManager.isLoggedIn());

  // 创建角色
  const createRes = await httpRequest('POST', '/api/character/create', {
    userId,
    characterName: '验证角色',
    gender: 'male',
    college: '计算机科学与技术学院'
  }, { Authorization: `Bearer ${token}` });
  assert('创建角色成功', createRes.status === 201 && createRes.body?.success === true);
  const characterId = createRes.body?.data?.characterId;
  assert('创建角色返回 characterId', !!characterId);

  sessionManager.addCharacter({
    characterId,
    userId,
    characterName: '验证角色',
    gender: 'male',
    college: '计算机科学与技术学院',
    grade: 1,
    semester: 1,
    week: 1,
    level: 1,
    experience: 0,
    money: 1000,
    physical: 50,
    social: 50,
    knowledge: 50,
    mood: 50
  });
  sessionManager.setCurrentCharacterId(characterId);
  assert('设置角色后 SaveManager 判断为登录模式', saveManager.isLoggedIn());

  console.log('  登录/创建角色流程验证完成');
  return { username, token, characterId };
}

async function runRemoteSaveFlow(token, characterId) {
  console.log('\n☁️ 远程存档流程验证');

  // 初始 GET
  const getInitial = await httpRequest('GET', `/api/character/${characterId}/save`, null, { Authorization: `Bearer ${token}` });
  assert('初始 GET save 成功', getInitial.status === 200 && getInitial.body?.success === true);
  assert('初始 GET 返回角色基础字段', getInitial.body?.data?.character_id === characterId);

  // PUT 更新
  const payload = {
    level: 3,
    experience: 150,
    money: 2500,
    physical: 65,
    social: 60,
    knowledge: 75,
    mood: 85,
    current_map_id: 1,
    position_x: 150,
    position_y: 250,
    grade: 1,
    semester: 1,
    week: 2,
    game_progress: {
      version: '1',
      savedAt: new Date().toISOString(),
      gameTime: { day: 2, hour: 15, minute: 0 },
      position: { mapId: 1, x: 150, y: 250 },
      progress: { verify: true },
      modules: { clubs: { joined: [1] } },
      settings: { volume: 0.7 }
    }
  };
  const putRes = await httpRequest('PUT', `/api/character/${characterId}/save`, payload, { Authorization: `Bearer ${token}` });
  assert('PUT save 成功', putRes.status === 200 && putRes.body?.success === true);
  assert('PUT save 返回 affectedRows', putRes.body?.data?.affectedRows === 1);

  // GET 验证更新
  const getAfter = await httpRequest('GET', `/api/character/${characterId}/save`, null, { Authorization: `Bearer ${token}` });
  assert('GET save 验证更新成功', getAfter.status === 200 && getAfter.body?.success === true);
  assert('远程 level 已更新', getAfter.body?.data?.level === 3);
  assert('远程 money 已更新', getAfter.body?.data?.money === 2500);
  assert('远程 game_progress 存在', !!getAfter.body?.data?.game_progress);
  assert('game_progress.progress 正确', getAfter.body?.data?.game_progress?.progress?.verify === true);

  // 通过 SaveManager 加载远程存档
  const loaded = await saveManager.load();
  assert('SaveManager 远程加载成功', loaded !== null);
  assert('SaveManager 加载后角色 level 为 3', loaded?.character?.level === 3);
  assert('SaveManager 加载后 money 为 2500', loaded?.character?.money === 2500);

  // 通过 SaveManager 保存（应走远程）
  global.window = { _character: { x: 300, y: 400 }, currentMapId: 1, timeSystem: { getTime: () => ({ day: 3, hour: 10, minute: 0 }) } };
  const saved = await saveManager.save();
  assert('SaveManager 远程保存成功', saved !== null);
  const getAfterSave = await httpRequest('GET', `/api/character/${characterId}/save`, null, { Authorization: `Bearer ${token}` });
  assert('远程保存后 position_x 更新', getAfterSave.body?.data?.position_x === 300);
  delete global.window;

  // POST reset
  const resetRes = await httpRequest('POST', `/api/character/${characterId}/save/reset`, {}, { Authorization: `Bearer ${token}` });
  assert('POST reset 成功', resetRes.status === 200 && resetRes.body?.success === true);
  const getAfterReset = await httpRequest('GET', `/api/character/${characterId}/save`, null, { Authorization: `Bearer ${token}` });
  assert('reset 后 level 恢复为 1', getAfterReset.body?.data?.level === 1);
  assert('reset 后 game_progress 为 NULL', getAfterReset.body?.data?.game_progress === null);

  console.log('  远程存档流程验证完成');
}

async function runLogoutFlow() {
  console.log('\n🚪 登出流程验证');
  // 保存一份本地游客存档
  saveManager.saveLocal({
    version: '1',
    savedAt: new Date().toISOString(),
    mode: 'guest',
    character: { characterName: '登出前游客' },
    gameTime: { day: 1, hour: 8, minute: 0 },
    position: { mapId: 1, x: 0, y: 0 },
    progress: {},
    modules: {},
    settings: {}
  });
  sessionManager.logout();
  assert('登出后 token 已清除', !sessionManager.getToken());
  assert('登出后 currentCharacterId 已清除', !sessionManager.getCurrentCharacterId());
  assert('登出后本地游客存档仍保留', saveManager.loadLocal()?.character?.characterName === '登出前游客');
  console.log('  登出流程验证完成');
}

async function main() {
  console.log('============================================');
  console.log(' HUST WORLD 存档/会话流程验证');
  console.log(` 目标服务: ${BASE_URL}`);
  console.log('============================================');

  // 先验证健康检查
  const health = await httpRequest('GET', '/api/health');
  if (health.status !== 200 || health.body?.success !== true) {
    console.error('服务健康检查失败，请确认后端已启动');
    process.exit(1);
  }
  console.log('✅ 服务健康检查通过');

  await runGuestFlow();
  const { username, token, characterId } = await runLoginFlow();
  await runRemoteSaveFlow(token, characterId);
  await runLogoutFlow();

  console.log('\n============================================');
  console.log(' 全部验证完成');
  console.log('============================================');
  console.log('提示：测试用户未自动清理，请运行 npm run cleanup:smoke 或');
  console.log(`      手动删除 username 以 "verify_user_" 开头的测试用户。`);
}

main().catch(error => {
  console.error('验证失败:', error);
  process.exit(1);
});
