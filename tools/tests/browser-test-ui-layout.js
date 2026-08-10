const { chromium } = require('playwright');
const { startServer, stopServer } = require('./test-server-helper');

const PORT = process.env.PORT || '8080';
const BASE = (process.env.BROWSER_TEST_BASE || process.env.SMOKE_API_BASE || `http://localhost:${PORT}`).replace(/\/$/, '');

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`[test:ui-layout] PASS ${message}`);
}

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  return errors;
}

async function checkDashboard(browser, viewport) {
  const page = await browser.newPage({ viewport });
  const errors = collectErrors(page);
  await page.goto(`${BASE}/tools/tests/test-game-dashboard.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForFunction(() => window.__testResults?.passed === true, null, { timeout: 30000 });

  const result = await page.evaluate(() => {
    const ids = ['gd-hud-character', 'gd-hud-stats', 'gd-hud-stamina', 'gd-hud-time', 'gd-hud-quest', 'gd-hud-location', 'gd-nav-bar'];
    const visibleRects = ids.map(id => document.getElementById(id)).filter(Boolean).filter(el => {
      const style = getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    }).map(el => ({ id: el.id, rect: el.getBoundingClientRect() }));
    const overlaps = [];
    for (let i = 0; i < visibleRects.length; i += 1) {
      for (let j = i + 1; j < visibleRects.length; j += 1) {
        const a = visibleRects[i];
        const b = visibleRects[j];
        if (a.rect.left < b.rect.right && a.rect.right > b.rect.left && a.rect.top < b.rect.bottom && a.rect.bottom > b.rect.top) {
          overlaps.push(`${a.id}/${b.id}`);
        }
      }
    }
    return {
      overlaps,
      noOverflow: document.documentElement.scrollWidth <= innerWidth + 1
    };
  });

  await page.click('[data-action="open-inventory"]');
  await page.waitForTimeout(220);
  const panelState = await page.evaluate(() => {
    const panel = document.querySelector('.gd-panel.gd-open')?.getBoundingClientRect();
    const hudStyle = getComputedStyle(document.querySelector('.gd-hud'));
    const navStyle = getComputedStyle(document.querySelector('.gd-nav-bar'));
    return {
      panelInside: !!panel && panel.left >= 0 && panel.top >= 0 && panel.right <= innerWidth && panel.bottom <= innerHeight,
      chromeHidden: Number(hudStyle.opacity) < 0.02 && Number(navStyle.opacity) < 0.02
    };
  });

  assert(result.overlaps.length === 0, `Dashboard ${viewport.width}px HUD 无重叠 (${result.overlaps.join(', ')})`);
  assert(panelState.panelInside, `Dashboard ${viewport.width}px 面板完整位于视口内`);
  assert(panelState.chromeHidden, `Dashboard ${viewport.width}px 打开面板时隐藏背景 HUD`);
  assert(result.noOverflow, `Dashboard ${viewport.width}px 无水平溢出`);
  assert(errors.length === 0, `Dashboard ${viewport.width}px 无页面错误 (${errors.join('; ')})`);
  await page.close();
}

async function checkQuestLog(browser, viewport) {
  const page = await browser.newPage({ viewport });
  const errors = collectErrors(page);
  await page.goto(`${BASE}/tools/tests/test-quest-system.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForFunction(() => typeof window.questTriggerManager !== 'undefined', null, { timeout: 30000 });
  await page.evaluate(async () => {
    const uiModule = await import('/game/js/ui/QuestTriggerUI.js');
    const ui = new uiModule.QuestTriggerUI();
    ui.init();
    ui.activeTab = 'main';
    ui.showPanel();
  });

  const result = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.quest-ui-overlay .quest-card')];
    const cardRects = cards.map(card => card.getBoundingClientRect());
    const childrenInside = cards.every(card => {
      const parent = card.getBoundingClientRect();
      return [...card.children].every(child => {
        const rect = child.getBoundingClientRect();
        return rect.top >= parent.top - 1 && rect.bottom <= parent.bottom + 1;
      });
    });
    const cardsSeparated = cardRects.every((rect, index) => index === 0 || rect.top >= cardRects[index - 1].bottom);
    const panel = document.querySelector('.quest-ui-panel')?.getBoundingClientRect();
    const body = document.querySelector('.quest-ui-body')?.getBoundingClientRect();
    return {
      childrenInside,
      cardsSeparated,
      cardCount: cards.length,
      panelInside: !!panel && panel.left >= 0 && panel.top >= 0 && panel.right <= innerWidth && panel.bottom <= innerHeight,
      bodyInside: !!panel && !!body && body.top >= panel.top && body.bottom <= panel.bottom + 1,
      noOverflow: document.documentElement.scrollWidth <= innerWidth + 1
    };
  });

  assert(result.cardCount > 0, `任务日志 ${viewport.width}px 渲染主线任务`);
  assert(result.childrenInside, `任务日志 ${viewport.width}px 卡片内容不越界`);
  assert(result.cardsSeparated, `任务日志 ${viewport.width}px 卡片互不重叠`);
  assert(result.panelInside && result.bodyInside, `任务日志 ${viewport.width}px 面板结构位于视口内`);
  assert(result.noOverflow, `任务日志 ${viewport.width}px 无水平溢出`);
  assert(errors.length === 0, `任务日志 ${viewport.width}px 无页面错误 (${errors.join('; ')})`);
  await page.close();
}

async function checkNpcDialogue(browser) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = collectErrors(page);
  await page.goto(`${BASE}/tools/tests/test-npc-dialogue.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForFunction(() => typeof window.debugOpenNpc === 'function', null, { timeout: 30000 });
  await page.evaluate(() => window.debugOpenNpc('volunteer_freshman'));
  const result = await page.evaluate(() => {
    const panel = document.querySelector('.npc-dialogue-panel')?.getBoundingClientRect();
    const options = [...document.querySelectorAll('.npc-dialogue-option')].map(el => el.getBoundingClientRect());
    return {
      panelInside: !!panel && panel.left >= 0 && panel.top >= 0 && panel.right <= innerWidth && panel.bottom <= innerHeight,
      optionsSeparated: options.every((rect, index) => index === 0 || rect.top >= options[index - 1].bottom),
      noOverflow: document.documentElement.scrollWidth <= innerWidth + 1
    };
  });
  assert(result.panelInside, 'NPC 对话移动端面板位于视口内');
  assert(result.optionsSeparated, 'NPC 对话选项互不重叠');
  assert(result.noOverflow, 'NPC 对话移动端无水平溢出');
  assert(errors.length === 0, `NPC 对话无页面错误 (${errors.join('; ')})`);
  await page.close();
}

async function checkMap(browser) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = collectErrors(page);
  await page.goto(`${BASE}/map/index.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('#hud', { timeout: 30000 });
  await page.waitForSelector('#minimapPanel', { timeout: 30000 });
  const skip = await page.$('#skipBtn');
  if (skip) await skip.click();
  const result = await page.evaluate(() => {
    const ids = ['hud', 'panelToggle', 'miniToolbar', 'minimapPanel'];
    const rects = ids.map(id => document.getElementById(id)).filter(Boolean).filter(el => getComputedStyle(el).display !== 'none').map(el => ({ id: el.id, rect: el.getBoundingClientRect() }));
    const overlaps = [];
    for (let i = 0; i < rects.length; i += 1) for (let j = i + 1; j < rects.length; j += 1) {
      const a = rects[i]; const b = rects[j];
      if (a.rect.left < b.rect.right && a.rect.right > b.rect.left && a.rect.top < b.rect.bottom && a.rect.bottom > b.rect.top) overlaps.push(`${a.id}/${b.id}`);
    }
    const canvas = document.getElementById('minimapCanvas');
    return { overlaps, minimapReady: !!canvas && canvas.width > 0 && canvas.height > 0, noOverflow: document.documentElement.scrollWidth <= innerWidth + 1 };
  });
  assert(result.minimapReady, '地图小地图已创建并具备绘制尺寸');
  assert(result.overlaps.length === 0, `地图控制区互不重叠 (${result.overlaps.join(', ')})`);
  assert(result.noOverflow, '地图页无水平溢出');
  assert(errors.length === 0, `地图页无页面错误 (${errors.join('; ')})`);
  await page.close();
}

async function run() {
  let browser;
  try {
    await startServer(PORT);
    browser = await chromium.launch({ headless: true });
    await checkDashboard(browser, { width: 1366, height: 768 });
    await checkDashboard(browser, { width: 390, height: 844 });
    await checkQuestLog(browser, { width: 1366, height: 768 });
    await checkQuestLog(browser, { width: 390, height: 844 });
    await checkNpcDialogue(browser);
    await checkMap(browser);
    console.log('[test:ui-layout] ALL PASSED');
  } finally {
    if (browser) await browser.close();
    await stopServer();
  }
}

run().catch(error => {
  console.error('[test:ui-layout] FAILED', error);
  process.exitCode = 1;
});
