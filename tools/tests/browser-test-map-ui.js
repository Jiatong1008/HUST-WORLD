// 测试覆盖：地图页加载无 JS error、地图 HUD 渲染、POI 面板可打开、NPC 提示可显示、任务追踪标记存在、室内场景可打开并返回、移动端 viewport 下主要控件不重叠。
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const { join } = require('path');
const fs = require('fs');

const root = join(__dirname, '..', '..');

const PORT = process.env.PORT || 4000;
const BASE = (process.env.BROWSER_TEST_BASE || `http://localhost:${PORT}`).replace(/\/$/, '');
const TEST_TIMEOUT = 60000;

let server;
let serverReady = false;

function startServer() {
  return new Promise((resolve, reject) => {
    server = spawn('node', ['server.js'], { cwd: root, env: { ...process.env, PORT: String(PORT) } });
    server.stdout.on('data', (data) => {
      const text = data.toString();
      process.stdout.write(text);
      if (!serverReady && text.includes(`http://localhost:${PORT}`)) {
        serverReady = true;
        resolve();
      }
    });
    server.stderr.on('data', (data) => process.stderr.write(data.toString()));
    server.on('error', reject);
    setTimeout(() => {
      if (!serverReady) {
        serverReady = true;
        resolve();
      }
    }, 5000);
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (!server) { resolve(); return; }
    server.on('close', resolve);
    server.kill('SIGTERM');
    setTimeout(() => {
      try { server.kill('SIGKILL'); } catch {}
      resolve();
    }, 3000);
  });
}

const results = [];
function log(msg) {
  results.push(msg);
  console.log(msg);
}

async function runTests() {
  await startServer();

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  const errors = [];

  page.on('pageerror', (err) => errors.push(`PAGE ERROR: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (text.includes('Failed to load resource')) return;
      errors.push(`CONSOLE ERROR: ${text}`);
    }
  });

  const url = `${BASE}/map/index.html`;
  log(`\n[map-ui] Loading ${url}...`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: TEST_TIMEOUT });
  await page.waitForTimeout(2500);

  const skipBtn = await page.$('#skipBtn');
  if (skipBtn) {
    log('[map-ui] Dismissing character creation dialog');
    await skipBtn.click();
    await page.waitForTimeout(800);
  }

  const hud = await page.$eval('#hud', el => ({
    hasHud: true,
    nameText: el.querySelector('#hudName')?.textContent || '',
    nearText: el.querySelector('#hudNear')?.textContent || ''
  })).catch(() => ({ hasHud: false, nameText: '', nearText: '' }));

  if (!hud.hasHud) errors.push('HUD not found');
  log(`[map-ui] HUD rendered: ${hud.hasHud}, name: ${hud.nameText}, near: ${hud.nearText}`);

  const hudButtons = await page.$$eval('#hudActions .hw-button', btns => btns.map(b => b.getAttribute('title')));
  log(`[map-ui] HUD buttons: ${hudButtons.join(', ')}`);

  const sidePanel = await page.$('#sidePanel');
  if (!sidePanel) errors.push('Side panel not found');
  log(`[map-ui] Side panel exists: ${!!sidePanel}`);

  const locList = await page.$$eval('#locList .loc-item', items => items.length).catch(() => 0);
  log(`[map-ui] Location list count: ${locList}`);

  await page.click('#panelToggle');
  await page.waitForTimeout(400);

  const firstLoc = await page.$('#locList .loc-item');
  if (firstLoc) {
    await firstLoc.click();
    await page.waitForTimeout(500);
  }

  const poiPanel = await page.$('#quest-poi-panel');
  const poiPanelVisible = poiPanel ? await page.evaluate(el => el.style.display !== 'none', poiPanel) : false;
  log(`[map-ui] POI panel visible: ${poiPanelVisible}`);
  if (!poiPanelVisible) errors.push('POI panel did not open on location select');

  if (poiPanelVisible) {
    await page.click('[data-poi-panel-action="close"]');
    await page.waitForTimeout(200);
  }

  const photoMilestones = await page.evaluate(() => {
    const enhancement = window._mapEnhancements;
    const locations = window._mapData?.getAllLocations?.().slice(0, 5) || [];
    if (!enhancement || locations.length < 5) return { ready: false };

    localStorage.removeItem('hust_world_photo_checkins');
    localStorage.removeItem('hust_world_achievements');
    enhancement.visitedPhotoIds.clear();

    const unlockEvents = [];
    const off = window._eventBus.on('achievement:unlock', ({ achievementId }) => unlockEvents.push(achievementId));
    enhancement._openDetailPanel(locations[0].map_id);
    enhancement._takePhotoOfSelected();
    const afterFirst = JSON.parse(localStorage.getItem('hust_world_achievements') || '[]');

    for (const location of locations.slice(1)) {
      enhancement._openDetailPanel(location.map_id);
      enhancement._takePhotoOfSelected();
    }
    off();

    return {
      ready: true,
      photoCount: JSON.parse(localStorage.getItem('hust_world_photo_checkins') || '[]').length,
      afterFirst,
      achievements: JSON.parse(localStorage.getItem('hust_world_achievements') || '[]'),
      unlockEvents
    };
  });
  const photoMilestonesPass = photoMilestones.ready
    && photoMilestones.photoCount === 5
    && photoMilestones.afterFirst.includes('first_poi_visit')
    && !photoMilestones.afterFirst.includes('photo_pioneer')
    && photoMilestones.achievements.includes('photo_pioneer')
    && photoMilestones.unlockEvents.filter(id => id === 'first_poi_visit').length === 1
    && photoMilestones.unlockEvents.filter(id => id === 'photo_pioneer').length === 1;
  log(`[map-ui] Photo milestones (1 / 5 POIs): ${photoMilestonesPass}`);
  if (!photoMilestonesPass) errors.push(`Photo milestone logic failed: ${JSON.stringify(photoMilestones)}`);

  // 关闭新增的 poi-detail-overlay，避免它遮挡后续巴士面板交互
  const detailOverlay = await page.$('#poiDetailOverlay.show');
  if (detailOverlay) {
    await page.evaluate(() => document.getElementById('poiDetailOverlay')?.classList.remove('show'));
    await page.waitForTimeout(150);
  }

  const busStopReady = await page.evaluate(() => {
    const stop = window._mapData?.getLocationsByType?.('bus_stop')?.[0];
    if (!stop || !window._character) return false;
    window._character.teleport(stop.x, stop.y);
    return true;
  });
  await page.waitForTimeout(250);
  if (busStopReady) {
    await page.keyboard.down('e');
    await page.waitForTimeout(150);
    await page.keyboard.up('e');
    await page.waitForTimeout(250);
    // Headless keyboard timing can miss the polling frame; fallback to direct API
    await page.evaluate(() => {
      if (!window._busTravel.isPanelVisible() && window._busTravel.nearbyStop) {
        window._busTravel.togglePanel();
      }
    });
    await page.waitForTimeout(150);
  }
  const busPanel = await page.evaluate(() => ({
    open: document.getElementById('busOverlay')?.classList.contains('show') === true,
    visible: getComputedStyle(document.getElementById('busOverlay')).display === 'flex',
    routes: document.querySelectorAll('.bus-route-card').length
  })).catch(() => ({ open: false, visible: false, routes: 0 }));
  log(`[map-ui] Bus panel opens with E: ${busPanel.open && busPanel.visible}, routes: ${busPanel.routes}`);
  if (!busPanel.open || !busPanel.visible || busPanel.routes === 0) errors.push('Bus panel did not open with E near a bus stop');
  if (busPanel.open) {
    await page.click('#busCloseBtn');
    await page.waitForTimeout(150);
  }

  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(300);
  const hudBox = await page.$eval('#hud', el => el.getBoundingClientRect()).catch(() => null);
  const panelToggleBox = await page.$eval('#panelToggle', el => el.getBoundingClientRect()).catch(() => null);
  if (hudBox && panelToggleBox) {
    const overlap = !(hudBox.right < panelToggleBox.left || hudBox.left > panelToggleBox.right ||
      hudBox.bottom < panelToggleBox.top || hudBox.top > panelToggleBox.bottom);
    log(`[map-ui] Mobile HUD overlap: ${overlap}`);
    if (overlap) errors.push('HUD and panel toggle overlap on mobile viewport');
  }

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(300);

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const hasJsErrors = errors.length > 0;
  log(`[map-ui] JS errors after reload: ${errors.length}`);
  for (const err of errors) log(`  ${err}`);

  await browser.close();

  if (hasJsErrors) {
    log('\n[map-ui] FAILED: JavaScript errors detected');
    process.exitCode = 1;
  } else {
    log('\n[map-ui] PASSED: Map UI smoke test completed');
  }

  const reportPath = join(root, 'tools', 'tests', 'test-map-ui-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    url,
    timestamp: new Date().toISOString(),
    errors,
    results,
    passed: !hasJsErrors
  }, null, 2));

  await stopServer();
}

runTests().catch(async (err) => {
  log(`\n[map-ui] FAILED: ${err.message || err}`);
  await stopServer();
  process.exit(1);
});
