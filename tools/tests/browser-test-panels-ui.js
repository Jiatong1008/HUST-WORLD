const { chromium } = require('playwright');
const { startServer, stopServer } = require('./test-server-helper');

const PORT = process.env.PORT || '8080';
const BASE = (process.env.BROWSER_TEST_BASE || process.env.SMOKE_API_BASE || `http://localhost:${PORT}`).replace(/\/$/, '');

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`[test:panels-ui] PASS ${message}`);
}

async function testDashboard(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${BASE}/tools/tests/test-game-dashboard.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForFunction(() => window.__testResults?.passed === true, null, { timeout: 30000 });

  const result = await page.evaluate(() => {
    const dashboard = window.dashboardTest ? document.querySelector('#game-dashboard-ui') : null;
    document.querySelector('[data-action="open-inventory"]')?.click();
    document.querySelector('[data-action="filter-inventory"][data-filter="quest"]')?.click();
    const questFilterActive = document.querySelector('[data-action="filter-inventory"][data-filter="quest"]')?.classList.contains('is-active');
    document.querySelector('[data-action="filter-inventory"][data-filter="all"]')?.click();
    document.querySelector('[data-action="close-panel"]')?.click();
    document.querySelector('[data-action="open-skills"]')?.click();
    document.querySelector('[data-action="filter-skills"][data-filter="study"]')?.click();
    return {
      dashboard: !!dashboard,
      questFilterActive,
      skillFilterActive: document.querySelector('[data-action="filter-skills"][data-filter="study"]')?.classList.contains('is-active'),
      hasSkillEffect: !!document.querySelector('.gd-skill-effect'),
      stylesheet: !!document.querySelector('link[href*="gameplay-panels.css"]')
    };
  });
  assert(result.dashboard, 'Dashboard 已挂载');
  assert(result.questFilterActive, '背包分类筛选可切换');
  assert(result.skillFilterActive, '技能分类筛选可切换');
  assert(result.hasSkillEffect, '技能卡展示效果或解锁条件');
  assert(result.stylesheet, '共享面板样式已加载');
  assert(errors.length === 0, `Dashboard 无页面错误 (${errors.join('; ')})`);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await page.evaluate(() => {
    const panel = document.querySelector('.gd-panel.gd-open');
    const bodyWidth = document.documentElement.scrollWidth;
    return { bodyWidth, viewport: window.innerWidth, panelWidth: panel?.getBoundingClientRect().width || 0 };
  });
  assert(mobile.bodyWidth <= mobile.viewport + 1, '移动端面板没有水平溢出');
  await page.close();
}

async function testDialogue(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${BASE}/tools/tests/test-npc-dialogue.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForFunction(() => typeof window.debugOpenNpc === 'function', null, { timeout: 30000 });
  const result = await page.evaluate(() => {
    window.debugOpenNpc('volunteer_freshman');
    const progress = document.querySelector('.npc-dialogue-progress');
    const option = document.querySelector('.npc-dialogue-option');
    const optionIndex = option?.querySelector('.npc-dialogue-option-index');
    const close = document.querySelector('.npc-dialogue-close');
    return {
      open: document.querySelector('.npc-dialogue-overlay')?.style.display === 'flex',
      progress: !!progress,
      optionIndex: !!optionIndex,
      closeLabel: close?.getAttribute('aria-label') || '',
      stylesheet: !!document.querySelector('#gameplay-panels-styles')
    };
  });
  assert(result.open, 'NPC 对话可打开');
  assert(result.progress, 'NPC 对话显示进度');
  assert(result.optionIndex, 'NPC 对话选项显示键位序号');
  assert(result.closeLabel, 'NPC 对话关闭按钮具备无障碍名称');
  assert(result.stylesheet, 'NPC 对话自动加载共享样式');
  assert(errors.length === 0, `NPC 对话无页面错误 (${errors.join('; ')})`);
  await page.close();
}

async function testQuestPanel(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${BASE}/tools/tests/test-npc-dialogue.html`, { waitUntil: 'networkidle', timeout: 30000 });
  const result = await page.evaluate(async () => {
    const module = await import('/game/js/ui/QuestTriggerUI.js');
    const ui = new module.QuestTriggerUI();
    ui.init();
    ui.activeTab = 'main';
    ui.showPanel();
    const firstCard = document.querySelector('.quest-card');
    firstCard?.click();
    const actionButtons = document.querySelectorAll('.quest-actions button');
    const wiredButtons = document.querySelectorAll('.quest-actions .quest-btn');
    return {
      summary: !!document.querySelector('.quest-ui-summary'),
      keyboardCard: firstCard?.getAttribute('tabindex') === '0',
      actionsWired: actionButtons.length === wiredButtons.length,
      visible: document.querySelector('.quest-ui-overlay')?.style.display === 'flex'
    };
  });
  assert(result.visible, '任务日志可打开');
  assert(result.summary, '任务日志显示用途摘要');
  assert(result.keyboardCard, '任务卡支持键盘聚焦');
  assert(result.actionsWired, '任务详情按钮全部绑定统一事件类');
  assert(errors.length === 0, `任务日志无页面错误 (${errors.join('; ')})`);
  await page.close();
}

async function run() {
  let browser;
  try {
    await startServer(PORT);
    browser = await chromium.launch({ headless: true });
    await testDashboard(browser);
    await testDialogue(browser);
    await testQuestPanel(browser);
    console.log('[test:panels-ui] ALL PASSED');
  } finally {
    if (browser) await browser.close();
    await stopServer();
  }
}

run().catch(error => {
  console.error('[test:panels-ui] FAILED', error);
  process.exitCode = 1;
});
