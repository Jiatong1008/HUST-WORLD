// 真实浏览器验收：test-main-quest.html
// 运行：node tools/tests/browser-test-main-quest.js
const { chromium } = require('playwright');

const PORT = process.env.PORT || '8080';
const BASE_URL = process.env.BROWSER_TEST_BASE || process.env.SMOKE_API_BASE || `http://localhost:${PORT}`;
const TEST_URL = `${BASE_URL}/tools/tests/test-main-quest.html`;
const SUCCESS_SCREENSHOT = 'tools/tests/test-main-quest-result.png';
const ERROR_SCREENSHOT = 'tools/tests/test-main-quest-error.png';

(async () => {
  console.log(`[浏览器验收] 启动 Chromium，访问 ${TEST_URL}`);
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
    console.error(`[❌] 主线浏览器验收失败: ${message}`);
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
        'debugMainQuest',
        'debugCompleteQuest',
        'debugResetMainQuest',
        'debugSaveQuestProgress',
        'debugLoadQuestProgress',
        'debugTeleportToQuest',
        'debugJumpToNextWeek',
        'debugRunFreshmanSemester',
        'debugRunAllSemesters'
      ].every(name => typeof window[name] === 'function');
    });
    console.log(`[检查] 全局调试函数全部挂载: ${functionsOk}`);

    const statusText = await page.$eval('#statusPanel', el => el.textContent);
    console.log(`[检查] 状态面板内容: ${statusText.substring(0, 80)}...`);

    const managerOk = await page.evaluate(() => !!window.questTriggerManager);
    console.log(`[检查] questTriggerManager 已加载: ${managerOk}`);

    const saveOk = await page.evaluate(() => !!window.saveManager);
    console.log(`[检查] SaveManager 已加载: ${saveOk}`);

    const timeSystemOk = await page.evaluate(() => !!window.timeSystem);
    console.log(`[检查] TimeSystem 已加载: ${timeSystemOk}`);

    const runBtn = await page.$('button:has-text("自动打穿大学四年")');
    console.log(`[检查] 自动打穿大学四年按钮存在: ${!!runBtn}`);

    console.log('[动作] 执行自动打穿大学四年');
    const runResult = await page.evaluate(async () => {
      return await window.debugRunAllSemesters();
    });
    console.log(`[检查] 自动打穿结果: ${JSON.stringify(runResult, null, 2)}`);

    const result = await page.evaluate(() => {
      const completed = Array.from(window.questTriggerManager.completedQuests);
      const phase = window.questTriggerManager.getCurrentPhase();
      return { completed, phaseName: phase.name };
    });
    console.log(`[检查] 已完成任务: ${result.completed.join(', ')}`);
    console.log(`[检查] 当前阶段: ${result.phaseName}`);

    const hasSenior2Summary = result.completed.includes('senior_2_summary');
    const hasGraduation = result.completed.includes('graduation');
    console.log(`[检查] senior_2_summary 已完成: ${hasSenior2Summary}`);
    console.log(`[检查] graduation 已完成: ${hasGraduation}`);

    const snapshotText = await page.$eval('#snapshotPanel', el => el.textContent);
    console.log(`[检查] localStorage 快照已显示: ${snapshotText.includes('progress')}`);

    await page.click('button:has-text("保存进度")');
    await page.waitForTimeout(500);
    const snapshotText2 = await page.$eval('#snapshotPanel', el => el.textContent);
    console.log(`[检查] 保存后 localStorage 快照已显示: ${snapshotText2.includes('progress')}`);

    await screenshot(SUCCESS_SCREENSHOT);

    if (!functionsOk || !managerOk || !saveOk || !timeSystemOk || !hasSenior2Summary || !hasGraduation || !runResult.success) {
      throw new Error('浏览器验收未全部通过');
    }
    console.log('[✅] test-main-quest.html 大学四年浏览器验收通过');
  } catch (e) {
    await fail(e.message);
  } finally {
    await browser.close();
  }
})();
