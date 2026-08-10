const { chromium } = require('playwright');
const { startServer, stopServer } = require('./test-server-helper');

const PORT = process.env.PORT || '8080';
const BASE = (process.env.BROWSER_TEST_BASE || process.env.SMOKE_API_BASE || `http://localhost:${PORT}`).replace(/\/$/, '');

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`[test:responsive] PASS ${message}`);
}

function parseDuration(value) {
  if (!value) return 0;
  return value
    .split(',')
    .map(part => part.trim())
    .map(part => part.endsWith('ms') ? Number(part.replace('ms', '')) / 1000 : Number(part.replace('s', '')))
    .filter(Number.isFinite)
    .reduce((max, current) => Math.max(max, current), 0);
}

async function testDashboardMobile(browser) {
  const page = await browser.newPage({ viewport: { width: 360, height: 740 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto(`${BASE}/tools/tests/test-game-dashboard.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForFunction(() => window.__testResults?.passed === true, null, { timeout: 30000 });

  const result = await page.evaluate(() => {
    const saveButton = document.querySelector('[data-action="save"]');
    saveButton?.focus();
    const focusStyle = saveButton ? window.getComputedStyle(saveButton) : null;
    const navButtons = Array.from(document.querySelectorAll('.gd-nav-btn')).map(button => button.getBoundingClientRect().height);
    document.querySelector('[data-action="open-inventory"]')?.click();
    const panel = document.querySelector('.gd-panel.gd-open');
    return {
      cssLoaded: !!document.querySelector('link[href*="responsive-motion.css"]'),
      scrollWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      viewportWidth: window.innerWidth,
      panelWidth: panel?.getBoundingClientRect().width || 0,
      minNavHeight: Math.min(...navButtons),
      focusOutline: focusStyle?.outlineStyle || '',
      focusShadow: focusStyle?.boxShadow || ''
    };
  });

  assert(result.cssLoaded, '游戏调试页加载响应式与动效样式');
  assert(result.scrollWidth <= result.viewportWidth + 1, `游戏页 document 无水平溢出 (${result.scrollWidth}/${result.viewportWidth})`);
  assert(result.bodyWidth <= result.viewportWidth + 1, `游戏页 body 无水平溢出 (${result.bodyWidth}/${result.viewportWidth})`);
  assert(result.panelWidth <= result.viewportWidth + 1, '游戏面板宽度不超过移动端视口');
  assert(result.minNavHeight >= 44, `底部导航触控高度不小于 44px (${result.minNavHeight})`);
  assert(result.focusOutline !== 'none' || result.focusShadow !== 'none', '键盘焦点具备可见反馈');
  assert(errors.length === 0, `游戏页无页面错误 (${errors.join('; ')})`);

  await page.close();
}

async function testMapMobile(browser) {
  const page = await browser.newPage({ viewport: { width: 375, height: 667 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto(`${BASE}/map/index.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('#hud', { timeout: 30000 });

  const result = await page.evaluate(() => {
    const toggle = document.querySelector('#panelToggle');
    toggle?.click();
    const sidePanel = document.querySelector('#sidePanel');
    const miniButtonHeights = Array.from(document.querySelectorAll('.mini-btn')).map(button => button.getBoundingClientRect().height);
    return {
      cssLoaded: !!document.querySelector('link[href*="responsive-motion.css"]'),
      scrollWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      viewportWidth: window.innerWidth,
      sidePanelWidth: sidePanel?.getBoundingClientRect().width || 0,
      minMiniButtonHeight: Math.min(...miniButtonHeights)
    };
  });

  assert(result.cssLoaded, '地图页加载响应式与动效样式');
  assert(result.scrollWidth <= result.viewportWidth + 1, `地图页 document 无水平溢出 (${result.scrollWidth}/${result.viewportWidth})`);
  assert(result.bodyWidth <= result.viewportWidth + 1, `地图页 body 无水平溢出 (${result.bodyWidth}/${result.viewportWidth})`);
  assert(result.sidePanelWidth <= result.viewportWidth + 1, '地图侧栏宽度不超过移动端视口');
  assert(result.minMiniButtonHeight >= 40, `地图工具按钮保持可触控高度 (${result.minMiniButtonHeight})`);
  assert(errors.length === 0, `地图页无页面错误 (${errors.join('; ')})`);

  await page.close();
}

async function testReducedMotion() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce'
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/tools/tests/test-game-dashboard.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForFunction(() => window.__testResults?.passed === true, null, { timeout: 30000 });

  const result = await page.evaluate(() => {
    const button = document.querySelector('.gd-nav-btn');
    const spinner = document.querySelector('.gd-loading-spinner') || document.createElement('div');
    spinner.className = 'gd-loading-spinner';
    document.body.appendChild(spinner);
    const buttonStyle = window.getComputedStyle(button);
    const spinnerStyle = window.getComputedStyle(spinner);
    return {
      transitionDuration: buttonStyle.transitionDuration,
      animationDuration: spinnerStyle.animationDuration
    };
  });

  assert(parseDuration(result.transitionDuration) <= 0.01, `减少动态效果时过渡时长降级 (${result.transitionDuration})`);
  assert(parseDuration(result.animationDuration) <= 0.01, `减少动态效果时动画时长降级 (${result.animationDuration})`);

  await browser.close();
}

async function run() {
  let browser;
  try {
    await startServer(PORT);
    browser = await chromium.launch({ headless: true });
    await testDashboardMobile(browser);
    await testMapMobile(browser);
    await browser.close();
    browser = null;
    await testReducedMotion();
    console.log('[test:responsive] ALL PASSED');
  } finally {
    if (browser) await browser.close();
    await stopServer();
  }
}

run().catch(error => {
  console.error('[test:responsive] FAILED', error);
  process.exitCode = 1;
});
