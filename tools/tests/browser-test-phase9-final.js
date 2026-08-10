const { chromium } = require('playwright');
const { join } = require('path');
const fs = require('fs');
const { startServer, stopServer } = require('./test-server-helper');

const root = join(__dirname, '..', '..');
const PORT = process.env.PORT || '8080';
const BASE = (process.env.BROWSER_TEST_BASE || process.env.SMOKE_API_BASE || `http://localhost:${PORT}`).replace(/\/$/, '');
const screenshotDir = join(root, 'docs', 'showcase', 'screenshots');
const reportDir = join(root, 'docs', 'showcase', 'reports');
const reportPath = join(reportDir, 'phase-9-ui-ux-final-report.json');

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`[test:phase9] PASS ${message}`);
}

function ensureDirs() {
  fs.mkdirSync(screenshotDir, { recursive: true });
  fs.mkdirSync(reportDir, { recursive: true });
}

function createPageErrorCollector(page, label) {
  const errors = [];
  page.on('pageerror', error => errors.push(`[${label}] ${error.message}`));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (text.includes('Failed to load resource') && text.includes('favicon')) return;
    errors.push(`[${label}] ${text}`);
  });
  return errors;
}

async function assertNoHorizontalOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
    viewportWidth: window.innerWidth
  }));
  assert(metrics.scrollWidth <= metrics.viewportWidth + 1, `${label} document 无水平溢出 (${metrics.scrollWidth}/${metrics.viewportWidth})`);
  assert(metrics.bodyWidth <= metrics.viewportWidth + 1, `${label} body 无水平溢出 (${metrics.bodyWidth}/${metrics.viewportWidth})`);
}

async function saveScreenshot(page, name, options = {}) {
  await page.evaluate(() => {
    document.querySelectorAll('#test-status, #test-log, .hw-toast-container').forEach(element => element.remove());
  });
  const filePath = join(screenshotDir, name);
  await page.screenshot({ path: filePath, fullPage: false, ...options });
  const stat = fs.statSync(filePath);
  assert(stat.size > 12000, `${name} 已生成且不是空白文件`);
  return {
    name,
    path: `docs/showcase/screenshots/${name}`,
    size: stat.size
  };
}

async function captureDashboard(browser) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = createPageErrorCollector(page, 'dashboard');
  await page.goto(`${BASE}/tools/tests/test-game-dashboard.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForFunction(() => window.__testResults?.passed === true, null, { timeout: 30000 });
  await assertNoHorizontalOverflow(page, '游戏主界面桌面端');
  const screenshot = await saveScreenshot(page, 'phase9-dashboard-desktop.png');
  assert(errors.length === 0, `游戏主界面无页面错误 (${errors.join('; ')})`);
  await page.close();
  return screenshot;
}

async function captureInventoryMobile(browser) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  const errors = createPageErrorCollector(page, 'inventory-mobile');
  await page.goto(`${BASE}/tools/tests/test-game-dashboard.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForFunction(() => window.__testResults?.passed === true, null, { timeout: 30000 });
  await page.click('[data-action="open-inventory"]');
  await page.waitForSelector('.gd-panel.gd-open #gd-inventory-body', { timeout: 10000 });
  await assertNoHorizontalOverflow(page, '移动端背包面板');
  const screenshot = await saveScreenshot(page, 'phase9-inventory-mobile.png');
  assert(errors.length === 0, `移动端背包无页面错误 (${errors.join('; ')})`);
  await page.close();
  return screenshot;
}

async function captureMap(browser) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = createPageErrorCollector(page, 'map');
  await page.goto(`${BASE}/map/index.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('#hud', { timeout: 30000 });
  const skipButton = await page.$('#skipBtn');
  if (skipButton) {
    await skipButton.click();
    await page.waitForTimeout(800);
  }
  await page.click('#panelToggle');
  await page.waitForTimeout(400);
  const firstLocation = await page.$('#locList .loc-item');
  if (firstLocation) {
    await firstLocation.click();
    await page.waitForTimeout(500);
  }
  await assertNoHorizontalOverflow(page, '地图桌面端');
  const screenshot = await saveScreenshot(page, 'phase9-map-desktop.png');
  assert(errors.length === 0, `地图页无页面错误 (${errors.join('; ')})`);
  await page.close();
  return screenshot;
}

async function captureNpcDialogue(browser) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = createPageErrorCollector(page, 'npc-dialogue');
  await page.goto(`${BASE}/tools/tests/test-npc-dialogue.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForFunction(() => typeof window.debugOpenNpc === 'function', null, { timeout: 30000 });
  await page.evaluate(() => window.debugOpenNpc('volunteer_freshman'));
  await page.waitForSelector('.npc-dialogue-overlay', { timeout: 10000 });
  await assertNoHorizontalOverflow(page, 'NPC 对话页');
  const screenshot = await saveScreenshot(page, 'phase9-npc-dialogue.png');
  assert(errors.length === 0, `NPC 对话无页面错误 (${errors.join('; ')})`);
  await page.close();
  return screenshot;
}

async function captureQuestLog(browser) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = createPageErrorCollector(page, 'quest-log');
  await page.goto(`${BASE}/tools/tests/test-npc-dialogue.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.evaluate(async () => {
    const module = await import('/game/js/ui/QuestTriggerUI.js');
    const ui = new module.QuestTriggerUI();
    ui.init();
    ui.activeTab = 'main';
    ui.showPanel();
  });
  await page.waitForSelector('.quest-ui-overlay', { timeout: 10000 });
  await assertNoHorizontalOverflow(page, '任务日志页');
  const screenshot = await saveScreenshot(page, 'phase9-quest-log.png');
  assert(errors.length === 0, `任务日志无页面错误 (${errors.join('; ')})`);
  await page.close();
  return screenshot;
}

async function run() {
  ensureDirs();
  let browser;
  const startedAt = new Date().toISOString();
  try {
    await startServer(PORT);
    browser = await chromium.launch({ headless: true });
    const screenshots = [];
    screenshots.push(await captureDashboard(browser));
    screenshots.push(await captureInventoryMobile(browser));
    screenshots.push(await captureMap(browser));
    screenshots.push(await captureNpcDialogue(browser));
    screenshots.push(await captureQuestLog(browser));

    const report = {
      title: 'HUST WORLD Phase 9 UI/UX Final Acceptance',
      baseUrl: BASE,
      startedAt,
      finishedAt: new Date().toISOString(),
      checks: [
        'dashboard desktop visual capture',
        'inventory mobile visual capture',
        'map desktop visual capture',
        'npc dialogue visual capture',
        'quest log visual capture',
        'horizontal overflow guard',
        'page error guard'
      ],
      screenshots,
      passed: true
    };
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(`[test:phase9] Report written: ${reportPath}`);
    console.log('[test:phase9] ALL PASSED');
  } finally {
    if (browser) await browser.close();
    await stopServer();
  }
}

run().catch(error => {
  console.error('[test:phase9] FAILED', error);
  process.exitCode = 1;
});
