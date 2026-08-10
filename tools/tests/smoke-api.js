const http = require('http');
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const PORT = process.env.PORT || 8080;
const BASE_URL = process.env.SMOKE_API_BASE || `http://localhost:${PORT}`;

const results = [];

const resolveField = (body, names) => {
  if (!body) return undefined;
  for (const name of names) {
    if (body[name] !== undefined) return body[name];
    if (body.data && body.data[name] !== undefined) return body.data[name];
  }
  return undefined;
};

function request(method, path, body = null, headers = {}) {
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
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, body: json, raw: data });
        } catch (error) {
          resolve({ status: res.statusCode, body: null, raw: data });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ status: 0, body: null, raw: error.message });
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test(name, method, path, body = null, validate = null, headers = {}) {
  const response = await request(method, path, body, headers);
  const success = (response.status >= 200 && response.status < 300 && (!validate || validate(response.body)))
    || (response.status >= 400 && validate && validate(response.body, response.status));
  results.push({ name, success, status: response.status, raw: response.raw });
  const status = success ? '✅ 通过' : '❌ 失败';
  console.log(`${status} ${name} (HTTP ${response.status})`);
  if (!success) {
    console.log(`   响应: ${response.raw}`);
  }
  return response;
}

async function main() {
  console.log('开始 HUST WORLD API 冒烟测试...');
  console.log(`目标服务: ${BASE_URL}\n`);

  await test('GET /api/health', 'GET', '/api/health', null, (body) => body.success && body.data.database === 'ok');
  await test('GET /api/maps', 'GET', '/api/maps');
  await test('GET /api/npcs', 'GET', '/api/npcs');
  await test('GET /api/npcs/type/teacher', 'GET', '/api/npcs/type/teacher');
  await test('GET /api/clubs', 'GET', '/api/clubs');
  await test('GET /api/tasks', 'GET', '/api/tasks');
  await test('GET /api/exploration', 'GET', '/api/exploration');

  const timestamp = Date.now();
  const registerBody = {
    username: `smoke_user_${timestamp}`,
    password: 'smoke123456',
    email: `smoke_${timestamp}@example.com`
  };
  const register = await test('POST /api/auth/register', 'POST', '/api/auth/register', registerBody, (body) => resolveField(body, ['userId', 'user_id']));
  const userId = resolveField(register.body, ['userId', 'user_id']);

  if (userId) {
    const login = await test('POST /api/auth/login', 'POST', '/api/auth/login', {
      username: registerBody.username,
      password: registerBody.password
    }, (body) => resolveField(body, ['token']));

    const token = resolveField(login.body, ['token']);
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

    const character = await test('POST /api/character/create', 'POST', '/api/character/create', {
      userId,
      characterName: `Smoke_${timestamp}`,
      gender: 'male',
      college: '计算机科学与技术学院'
    }, (body) => resolveField(body, ['characterId', 'character_id']));

    const characterId = resolveField(character.body, ['characterId', 'character_id']);

    if (userId) {
      await test('GET /api/character/user/:userId', 'GET', `/api/character/user/${userId}`);
    }

    if (characterId) {
      await test('GET /api/running/:characterId/stats', 'GET', `/api/running/${characterId}/stats`);

      const savePath = `/api/character/${characterId}/save`;
      const getInitial = await test('GET save (initial)', 'GET', savePath, null, (body) => resolveField(body, ['character_id']) && resolveField(body, ['level']) === 1, authHeaders);
      const initialLevel = resolveField(getInitial.body, ['level']);

      const savePayload = {
        level: 2,
        experience: 50,
        money: 1200,
        physical: 55,
        social: 60,
        knowledge: 58,
        mood: 70,
        current_map_id: 1,
        position_x: 100,
        position_y: 200,
        game_progress: { gameTime: { day: 1, hour: 10 }, position: { x: 100, y: 200 }, progress: ['tutorial'], modules: {} }
      };
      await test('PUT save (update)', 'PUT', savePath, savePayload, (body) => body.success && resolveField(body, ['affectedRows']) === 1, authHeaders);
      await test('GET save (verify update)', 'GET', savePath, null, (body) => resolveField(body, ['level']) === 2 && resolveField(body, ['mood']) === 70, authHeaders);
      await test('POST save/reset', 'POST', `${savePath}/reset`, {}, (body) => body.success && resolveField(body, ['affectedRows']) === 1, authHeaders);
      await test('GET save (verify reset)', 'GET', savePath, null, (body) => resolveField(body, ['level']) === 1 && resolveField(body, ['money']) === 1000, authHeaders);

      await test('PUT save rejected for invalid mood', 'PUT', savePath, { mood: 9999 }, (body, status) => !body.success && status === 400, authHeaders);
      await test('PUT save rejected for forbidden user_id', 'PUT', savePath, { user_id: 1 }, (body, status) => !body.success && status === 400, authHeaders);
    }
  } else {
    console.log('❌ 注册失败，跳过登录、角色创建及相关测试');
  }

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log('\n========== 汇总结果 ==========');
  console.log(`总测试数: ${results.length}`);
  console.log(`通过: ${passed}`);
  console.log(`失败: ${failed}`);
  console.log(failed === 0 ? '全部通过 ✅' : '存在失败用例，请检查 ❌');
  console.log('==============================');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('冒烟测试执行异常:', error);
  process.exit(1);
});
