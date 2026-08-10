// 真实浏览器验收：游戏主入口主线
// 运行：node tools/tests/browser-test-game-quest.js
const { chromium } = require('playwright');

const PORT = process.env.PORT || '8080';
const BASE_URL = process.env.BROWSER_TEST_BASE || process.env.SMOKE_API_BASE || `http://localhost:${PORT}`;
const GAME_URL = `${BASE_URL}/game/index.html`;
const SUCCESS_SCREENSHOT = 'tools/tests/game-quest-result.png';
const ERROR_SCREENSHOT = 'tools/tests/game-quest-error.png';

(async () => {
  console.log(`[游戏主入口验收] 启动 Chromium，访问 ${GAME_URL}`);
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  const jsErrors = [];
  page.on('console', msg => console.log(`[PAGE CONSOLE] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => { jsErrors.push(err.message); console.log(`[PAGE ERROR] ${err.message}`); });
  page.on('response', response => { if (response.status() >= 400) console.log(`[HTTP ${response.status()}] ${response.url()}`); });

  async function screenshot(path) {
    await page.screenshot({ path });
    console.log(`[截图] 已保存到 ${path}`);
  }
  async function fail(message) {
    console.error(`[❌] 游戏主入口验收失败: ${message}`);
    await screenshot(ERROR_SCREENSHOT);
    await browser.close();
    process.exit(1);
  }

  try {
    await page.goto(GAME_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(500);
    if (jsErrors.length > 0) throw new Error(`页面加载 JS 错误: ${jsErrors.join('; ')}`);

    await page.evaluate(() => {
      localStorage.removeItem('hust_world_save_v1');
      localStorage.removeItem('hust_world_time');
      localStorage.removeItem('hust_world_character');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    await page.waitForSelector('#btn-new-game', { state: 'visible', timeout: 30000 });
    await page.evaluate(() => document.getElementById('btn-new-game').click());

    const genderMale = await page.waitForSelector('#genderMale', { state: 'visible', timeout: 30000 }).catch(() => null);
    if (genderMale) {
      await page.click('#genderMale', { force: true });
      await page.fill('#characterName', '测试角色');
      await page.click('#skipBtn', { force: true });
    }

    await page.waitForFunction(() => window._mapSystemReady === true, { timeout: 30000 });

    await page.waitForSelector('#character-creation-overlay', { state: 'visible', timeout: 30000 });
    await page.waitForTimeout(500);
    await page.click('#skip-all-btn', { force: true });

    await page.waitForFunction(() => {
      const loading = document.getElementById('loading-screen');
      return !loading || loading.style.display === 'none' || loading.classList.contains('hidden');
    }, { timeout: 30000 });
    await page.waitForTimeout(1500);

    const initOk = await page.evaluate(() => {
      return !!window.questTriggerManager && !!window.questTriggerUI && window.questTriggerUI.initialized;
    });
    console.log(`[检查] QuestTriggerManager/UI 已初始化: ${initOk}`);

    const statusBarExists = await page.$eval('#quest-status-bar', el => el !== null).catch(() => false);
    console.log(`[检查] 任务状态栏 DOM 存在: ${statusBarExists}`);

    await page.keyboard.press('j');
    await page.waitForTimeout(500);
    const statusBarVisible = await page.evaluate(() => {
      const el = document.getElementById('quest-status-bar');
      return el && el.style.display !== 'none';
    });
    console.log(`[检查] J 键打开任务日志: ${statusBarVisible}`);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    await page.evaluate(() => {
      window.questTriggerManager.updatePlayerPosition(2526, 2773);
    });
    await page.waitForTimeout(800);

    const afterMove = await page.evaluate(() => {
      const qm = window.questTriggerManager;
      return {
        available: qm.getAvailableQuests().map(q => q.id),
        completed: Array.from(qm.completedQuests),
        active: qm.activeQuest,
        freshmanArrivalStatus: qm.questStatus['freshman_arrival']
      };
    });
    console.log(`[检查] 移动到南大门后任务状态: ${JSON.stringify(afterMove)}`);

    const promptVisible = await page.evaluate(() => {
      const el = document.getElementById('quest-trigger-prompt');
      return el && el.style.opacity !== '0' && el.textContent.length > 0;
    });
    console.log(`[检查] 到达任务地点提示: ${promptVisible}`);

    if (afterMove.completed.length === 0) {
      await page.keyboard.press('e');
      await page.waitForTimeout(1500);
    }

    const activeOrDone = await page.evaluate(() => {
      const qm = window.questTriggerManager;
      const completed = Array.from(qm.completedQuests);
      const active = qm.activeQuest;
      return { completed, active };
    });
    console.log(`[检查] 任务状态: ${JSON.stringify(activeOrDone)}`);

    const triggered = activeOrDone.completed.length > 0 || activeOrDone.active !== null;
    console.log(`[检查] E 键触发任务成功: ${triggered}`);

    await page.evaluate(() => window.saveManager.save());
    await page.waitForTimeout(500);
    const hasSave = await page.evaluate(() => !!localStorage.getItem('hust_world_save_v1'));
    console.log(`[检查] 自动保存/手动保存后存档存在: ${hasSave}`);

    await screenshot(SUCCESS_SCREENSHOT);

    if (!initOk || !statusBarVisible || !promptVisible || !triggered || !hasSave) {
      throw new Error('主游戏入口任务交互验收未全部通过');
    }
    console.log('[✅] 主游戏入口浏览器验收通过');
  } catch (e) {
    await fail(e.message);
  } finally {
    await browser.close();
  }
})();
