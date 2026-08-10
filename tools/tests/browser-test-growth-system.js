// 真实浏览器验收：test-growth-system.html
// 运行：node tools/tests/browser-test-growth-system.js
const { chromium } = require('playwright');
const { startServer, stopServer } = require('./test-server-helper.js');

const PORT = process.env.PORT || '8080';
const BASE_URL = (process.env.BROWSER_TEST_BASE || process.env.SMOKE_API_BASE || `http://localhost:${PORT}`).replace(/\/$/, '');
const TEST_URL = `${BASE_URL}/tools/tests/test-growth-system.html`;
const SUCCESS_SCREENSHOT = 'tools/tests/test-growth-system-result.png';
const ERROR_SCREENSHOT = 'tools/tests/test-growth-system-error.png';

(async () => {
  await startServer(PORT);
  console.log(`[角色成长浏览器验收] 启动 Chromium，访问 ${TEST_URL}`);
  const browser = await chromium.launch({
    headless: true,
    channel: 'msedge'
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  const jsErrors = [];
  page.on('console', msg => {
    console.log(`[PAGE CONSOLE] ${msg.type()}: ${msg.text()}`);
  });
  page.on('pageerror', err => {
    jsErrors.push(err.message);
    console.log(`[PAGE ERROR] ${err.message}`);
  });
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`[HTTP ${response.status()}] ${response.url()}`);
    }
  });

  async function screenshot(path) {
    await page.screenshot({ path });
    console.log(`[截图] 已保存到 ${path}`);
  }

  async function fail(message) {
    console.error(`[❌] 浏览器验收失败: ${message}`);
    await screenshot(ERROR_SCREENSHOT);
    await browser.close();
    await stopServer();
    process.exit(1);
  }

  try {
    await page.goto(TEST_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(800);

    if (jsErrors.length > 0) {
      throw new Error(`页面加载出现 JS 错误: ${jsErrors.join('; ')}`);
    }
    console.log('[检查] 页面加载无 JS 错误');

    const initOk = await page.evaluate(() => {
      return !!window.questManager && !!window.saveManager;
    });
    console.log(`[检查] 全局对象挂载: ${initOk}`);
    if (!initOk) throw new Error('questManager / saveManager 未挂载');

    const initial = await page.evaluate(() => {
      const s = window.questManager.characterStats;
      return {
        level: s.level,
        experience: s.experience,
        stamina: s.stamina,
        maxStamina: s.maxStamina,
        knowledge: s.knowledge,
        social: s.social,
        mood: s.mood,
        money: s.money
      };
    });
    console.log('[检查] 初始属性:', initial);
    if (initial.level < 1) throw new Error('等级初始化异常');
    if (initial.stamina < 0 || initial.stamina > initial.maxStamina) throw new Error('初始体力越界');
    if (initial.money < 0) throw new Error('初始金币异常');

    const expBefore = initial.experience;
    await page.click('#btn-add-exp');
    await page.waitForTimeout(300);
    const afterAddExp = await page.evaluate(() => ({
      experience: window.questManager.characterStats.experience,
      level: window.questManager.characterStats.level
    }));
    console.log(`[检查] +100 经验: ${expBefore} -> 经验 ${afterAddExp.experience}，等级 ${initial.level} -> ${afterAddExp.level}`);
    if (afterAddExp.experience === expBefore && afterAddExp.level === initial.level) {
      throw new Error('+100 经验后经验值与等级均未变化');
    }

    const levelBefore = await page.evaluate(() => window.questManager.characterStats.level);
    await page.click('#btn-trigger-level-up');
    await page.waitForTimeout(400);
    const levelAfter = await page.evaluate(() => window.questManager.characterStats.level);
    const expAfterLevelUp = await page.evaluate(() => window.questManager.characterStats.experience);
    console.log(`[检查] 连升经验: 等级 ${levelBefore} -> ${levelAfter}，经验 ${expAfterLevelUp}`);
    if (levelAfter <= levelBefore) throw new Error('连升经验后未升级');

    await page.click('#btn-reduce-stamina');
    await page.click('#btn-reduce-stamina');
    await page.click('#btn-reduce-stamina');
    await page.waitForTimeout(300);
    const staminaAfterDrain = await page.evaluate(() => window.questManager.characterStats.stamina);
    console.log(`[检查] 多次消耗体力后: ${staminaAfterDrain}`);
    if (staminaAfterDrain < 0) throw new Error('体力可以低于 0');
    if (staminaAfterDrain > initial.maxStamina) throw new Error('体力可以高于上限');

    await page.click('#btn-reset');
    await page.waitForTimeout(300);
    const moneyAfterReset = await page.evaluate(() => window.questManager.characterStats.money);
    console.log(`[检查] 重置后金币: ${moneyAfterReset}`);
    if (moneyAfterReset < 0) throw new Error('金币可以低于 0');

    await page.click('#btn-apply-package');
    await page.waitForTimeout(300);
    const rewardState = await page.evaluate(() => {
      const s = window.questManager.characterStats;
      return { money: s.money, stamina: s.stamina, knowledge: s.knowledge, mood: s.mood };
    });
    console.log(`[检查] 模拟任务奖励包后:`, rewardState);
    if (rewardState.money <= 0) throw new Error('任务奖励包后金币未增加');
    if (rewardState.stamina <= 0) throw new Error('任务奖励包后体力未增加');
    if (rewardState.knowledge <= 0) throw new Error('任务奖励包后知识未增加');
    if (rewardState.mood <= 0) throw new Error('任务奖励包后心情未增加');

    const beforeSave = await page.evaluate(() => {
      const s = window.questManager.characterStats;
      return { level: s.level, experience: s.experience, money: s.money, stamina: s.stamina };
    });
    await page.click('#btn-reset');
    await page.waitForTimeout(300);

    await page.evaluate(() => {
      if (window.saveManager) {
        window.saveManager.save = () => Promise.resolve(null);
        window.saveManager.saveLocalSync = () => null;
      }
      const saveKey = 'hust_world_save_v1';
      const snapshot = {
        version: '1',
        savedAt: new Date().toISOString(),
        mode: 'guest',
        character: {
          characterId: null,
          characterName: '游客',
          gender: 'unknown',
          college: '计算机科学与技术学院',
          level: 1,
          experience: 0,
          money: 1000,
          physical: 75,
          social: 50,
          knowledge: 50,
          mood: 50,
          grade: 1,
          semester: 1,
          week: 1
        },
        gameTime: { day: 1, hour: 8, minute: 0 },
        position: { mapId: 1, x: 0, y: 0 },
        progress: {
          currentPhaseIndex: 0,
          activeQuest: null,
          completedQuests: [],
          questStatus: {},
          visitedLocations: [],
          unlockedSubjects: [],
          unlockedSkills: [],
          proficiencies: {},
          gameTime: { day: 1, hour: 8 },
          stats: {
            level: 1,
            experience: 0,
            money: 1000,
            physical: 75,
            social: 50,
            knowledge: 50,
            mood: 50
          }
        },
        modules: {},
        settings: {}
      };
      localStorage.setItem(saveKey, JSON.stringify(snapshot));
    });

    jsErrors.length = 0;
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(600);
    if (jsErrors.length > 0) {
      throw new Error(`旧 physical 字段迁移后页面出现 JS 错误: ${jsErrors.join('; ')}`);
    }
    const migratedStamina = await page.evaluate(() => window.questManager.characterStats.stamina);
    console.log(`[检查] 旧 physical=75 迁移后 stamina: ${migratedStamina}`);
    if (migratedStamina !== 75) throw new Error('旧 physical 字段未正确迁移为 stamina');

    await screenshot(SUCCESS_SCREENSHOT);

    console.log('[✅] test-growth-system.html 角色成长浏览器验收通过');
  } catch (e) {
    await fail(e.message);
  } finally {
    await browser.close();
    await stopServer();
  }
})();
