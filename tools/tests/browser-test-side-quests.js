// 真实浏览器验收：test-side-quests.html
// 运行：node tools/tests/browser-test-side-quests.js
const { chromium } = require('playwright');

const PORT = process.env.PORT || '8080';
const BASE_URL = process.env.BROWSER_TEST_BASE || process.env.SMOKE_API_BASE || `http://localhost:${PORT}`;
const TEST_URL = `${BASE_URL}/tools/tests/test-side-quests.html`;
const SUCCESS_SCREENSHOT = 'tools/tests/test-side-quests-result.png';
const ERROR_SCREENSHOT = 'tools/tests/test-side-quests-error.png';

(async () => {
  console.log(`[支线浏览器验收] 启动 Chromium，访问 ${TEST_URL}`);
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
    console.error(`[❌] 支线浏览器验收失败: ${message}`);
    await screenshot(ERROR_SCREENSHOT);
    await browser.close();
    process.exit(1);
  }

  try {
    await page.goto(TEST_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(800);
    if (jsErrors.length > 0) throw new Error(`页面加载 JS 错误: ${jsErrors.join('; ')}`);

    const functionsOk = await page.evaluate(() => {
      return [
        'debugRunClubQuestline',
        'debugRunRunningQuestline',
        'debugRunExplorationQuestline',
        'debugResetSideQuests',
        'debugExportFullProgress'
      ].every(name => typeof window[name] === 'function');
    });
    console.log(`[检查] 支线全局调试函数全部挂载: ${functionsOk}`);

    const statusText = await page.$eval('#statusPanel', el => el.textContent);
    console.log(`[检查] 状态面板内容: ${statusText.substring(0, 80)}...`);

    const managerOk = await page.evaluate(() => !!window.questTriggerManager);
    console.log(`[检查] questTriggerManager 已加载: ${managerOk}`);

    const saveOk = await page.evaluate(() => !!window.saveManager);
    console.log(`[检查] SaveManager 已加载: ${saveOk}`);

    const sideConfigOk = await page.evaluate(() => {
      const qm = window.questTriggerManager;
      return qm.getSideQuestsByCategory().club.length === 5 &&
             qm.getSideQuestsByCategory().running.length === 5 &&
             qm.getSideQuestsByCategory().exploration.length === 5;
    });
    console.log(`[检查] 支线任务配置已加载（每类5个）: ${sideConfigOk}`);

    await page.evaluate(() => window.questTriggerManager.resetSideQuests());
    console.log('[动作] 已重置支线进度');

    const clubResult = await page.evaluate(async () => await window.debugRunClubQuestline());
    console.log(`[检查] 社团支线完成: ${clubResult.success}, 完成数: ${clubResult.results.length}`);

    const runningResult = await page.evaluate(async () => await window.debugRunRunningQuestline());
    console.log(`[检查] 跑步支线完成: ${runningResult.success}, 完成数: ${runningResult.results.length}`);

    const explorationResult = await page.evaluate(async () => await window.debugRunExplorationQuestline());
    console.log(`[检查] 探索支线完成: ${explorationResult.success}, 完成数: ${explorationResult.results.length}`);

    const allSideDone = await page.evaluate(() => {
      const qm = window.questTriggerManager;
      const groups = qm.getSideQuestsByCategory();
      const done = (arr) => arr.every(q => q.status === 'COMPLETED');
      return done(groups.club) && done(groups.running) && done(groups.exploration);
    });
    console.log(`[检查] 所有支线任务均已完成: ${allSideDone}`);

    const mainQuestsNotPolluted = await page.evaluate(() => {
      const qm = window.questTriggerManager;
      const completed = Array.from(qm.completedQuests);
      const sideIds = Object.keys(qm.getSideQuestsByCategory().all.map(q => q.id));
      return completed.filter(id => sideIds.includes(id)).length === 0;
    });
    console.log(`[检查] 主线完成列表未混入支线ID: ${mainQuestsNotPolluted}`);

    const progress = await page.evaluate(() => window.debugExportFullProgress());
    console.log(`[检查] progress 包含 sideQuests: ${!!progress.sideQuests}`);
    console.log(`[检查] progress 包含 sideQuests.status: ${!!(progress.sideQuests && progress.sideQuests.status)}`);
    console.log(`[检查] progress 包含 sideQuests.progress: ${!!(progress.sideQuests && progress.sideQuests.progress)}`);

    await page.evaluate(() => window.debugSaveProgress());
    await page.waitForTimeout(500);

    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(500);

    const restored = await page.evaluate(() => {
      const qm = window.questTriggerManager;
      const groups = qm.getSideQuestsByCategory();
      const done = (arr) => arr.every(q => q.status === 'COMPLETED');
      return {
        club: done(groups.club),
        running: done(groups.running),
        exploration: done(groups.exploration),
        mainPhase: qm.getCurrentPhase().name
      };
    });
    console.log(`[检查] 刷新后社团支线完成: ${restored.club}`);
    console.log(`[检查] 刷新后跑步支线完成: ${restored.running}`);
    console.log(`[检查] 刷新后探索支线完成: ${restored.exploration}`);
    console.log(`[检查] 刷新后主线阶段: ${restored.mainPhase}`);
    const allRestored = restored.club && restored.running && restored.exploration;

    await page.evaluate(() => window.debugResetSideQuests());
    await page.evaluate(() => window.debugSaveProgress());
    console.log('[动作] 测试结束，已重置支线进度并保存');

    await screenshot(SUCCESS_SCREENSHOT);

    if (!functionsOk || !managerOk || !saveOk || !sideConfigOk || !allSideDone || !mainQuestsNotPolluted || !progress.sideQuests || !allRestored) {
      throw new Error('支线浏览器验收未全部通过');
    }

    console.log('[✅] test-side-quests.html 支线浏览器验收通过');
  } catch (e) {
    await fail(e.message);
  } finally {
    await browser.close();
  }
})();
