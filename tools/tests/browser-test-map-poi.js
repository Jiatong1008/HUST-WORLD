// 真实浏览器验收：test-map-poi.html
// 运行：node tools/tests/browser-test-map-poi.js
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const { join } = require('path');

const root = join(__dirname, '..', '..');

const PORT = process.env.PORT || '8080';
const BASE_URL = (process.env.BROWSER_TEST_BASE || process.env.SMOKE_API_BASE || `http://localhost:${PORT}`).replace(/\/$/, '');
const TEST_URL = `${BASE_URL}/tools/tests/test-map-poi.html`;
const SUCCESS_SCREENSHOT = 'tools/tests/test-map-poi-result.png';
const ERROR_SCREENSHOT = 'tools/tests/test-map-poi-error.png';

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

(async () => {
  await startServer();
  console.log(`[地图POI浏览器验收] 启动 Chromium，访问 ${TEST_URL}`);
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  const jsErrors = [];
  page.on('console', msg => console.log(`[PAGE CONSOLE] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => {
    jsErrors.push(err.message);
    console.log(`[PAGE ERROR] ${err.message}`);
    if (err.stack) console.log(`[PAGE ERROR STACK] ${err.stack}`);
  });
  page.on('requestfailed', request => console.log(`[REQUEST FAILED] ${request.url()}: ${request.failure()?.errorText || 'unknown'}`));
  page.on('response', response => { if (response.status() >= 400) console.log(`[HTTP ${response.status()}] ${response.url()}`); });

  async function screenshot(path) {
    await page.screenshot({ path });
    console.log(`[截图] 已保存到 ${path}`);
  }
  async function fail(message) {
    console.error(`[❌] 地图POI浏览器验收失败: ${message}`);
    await screenshot(ERROR_SCREENSHOT);
    await browser.close();
    await stopServer();
    process.exit(1);
  }

  try {
    await page.goto(TEST_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(800);
    if (jsErrors.length > 0) throw new Error(`页面加载 JS 错误: ${jsErrors.join('; ')}`);

    const ua = await page.evaluate(() => navigator.userAgent);
    console.log(`[BROWSER] ${ua}`);

    const diag = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      return scripts.map(s => ({
        src: s.src,
        type: s.type,
        textPreview: s.textContent?.slice(0, 60).replace(/\s+/g, ' ') || ''
      }));
    });
    console.log('[DIAG] scripts:', JSON.stringify(diag, null, 2));

    const lastError = await page.evaluate(() => window.__lastJsError || null);
    console.log('[DIAG] last captured error:', lastError);

    const functionsOk = await page.evaluate(() => {
      return [
        'debugMapPoiBindings',
        'debugClickPoi',
        'debugApproachPoi',
        'debugTrackQuest',
        'debugEnterScene',
        'debugReturnCampus',
        'debugExportPoiReport'
      ].every(name => typeof window[name] === 'function');
    });
    console.log(`[检查] 地图POI全局调试函数全部挂载: ${functionsOk}`);

    await page.evaluate(() => window.debugMapPoiBindings());
    await page.waitForTimeout(500);

    const poiReport = await page.evaluate(() => window.questPoiBinder.exportReport());
    console.log(`[检查] POI 绑定总数: ${poiReport.totalQuests}, 已绑定: ${poiReport.bound}, 待配置: ${poiReport.unbound}`);

    const sideQuests = await page.evaluate(() => {
      return Object.values(window.questTriggerManager.getSideQuestsByCategory().all || {});
    });
    const allSideResolved = poiReport.bindings
      .filter(b => b.questType === 'side')
      .every(b => b.status === 'bound' || b.status === 'special');
    console.log(`[检查] 所有支线任务 POI 已解析: ${allSideResolved} (共 ${sideQuests.length} 个)`);

    const mainKeyQuests = ['freshman_arrival', 'math_final_exam', 'club_join', 'graduation'];
    const mainResolved = poiReport.bindings
      .filter(b => b.questType === 'main' && mainKeyQuests.includes(b.questId))
      .every(b => b.status === 'bound' || b.status === 'special');
    console.log(`[检查] 主线关键任务 POI 已解析: ${mainResolved}`);

    await page.evaluate(() => window.questTriggerManager.resetSideQuests());
    await page.waitForTimeout(300);

    await page.evaluate(() => window.debugTriggerQuest('buy_stationery'));
    const buyDone = await page.evaluate(() => window.questTriggerManager.sideQuestStatus['buy_stationery'] === 'COMPLETED');
    console.log(`[检查] 模拟触发 buy_stationery 完成: ${buyDone}`);

    await page.evaluate(() => window.questTriggerManager.resetSideQuests());
    await page.evaluate(async () => {
      await window.debugTriggerQuest('freshman_arrival');
      await window.debugTriggerQuest('explore_canteen_secret');
    });
    const canteenDone = await page.evaluate(() => window.questTriggerManager.sideQuestStatus['explore_canteen_secret'] === 'COMPLETED');
    console.log(`[检查] 模拟触发 explore_canteen_secret 完成: ${canteenDone}`);

    await page.evaluate(() => window.questTriggerManager.resetSideQuests());
    await page.evaluate(async () => {
      await window.debugTriggerQuest('freshman_arrival');
      await window.debugTriggerQuest('explore_first');
    });
    const exploreDone = await page.evaluate(() => window.questTriggerManager.sideQuestStatus['explore_first'] === 'COMPLETED');
    console.log(`[检查] 模拟触发 explore_first 完成: ${exploreDone}`);

    const beforeSave = await page.evaluate(() => {
      const snap = window.saveManager.buildSnapshot();
      window.saveManager.saveLocal(snap);
      return JSON.stringify(snap.progress.sideQuests?.status || {});
    });
    console.log(`[诊断] 保存前 sideQuests.status: ${beforeSave}`);

    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(800);
    const afterLoad = await page.evaluate(() => {
      const snap = window.saveManager.loadLocal();
      return JSON.stringify(snap.progress.sideQuests?.status || {});
    });
    console.log(`[诊断] 刷新后 sideQuests.status: ${afterLoad}`);
    const exploreRestored = await page.evaluate(() => window.questTriggerManager.sideQuestStatus['explore_first'] === 'COMPLETED');
    console.log(`[检查] 刷新后 explore_first 进度保留: ${exploreRestored}`);

    const trackDiag = await page.evaluate(() => {
      const b = window.questPoiBinder.getBindingByQuestId('club_join');
      return { exists: !!b, initialized: window.questPoiBinder.initialized, count: window.questPoiBinder.getBindings().length };
    });
    console.log(`[诊断] questPoiBinder 状态: ${JSON.stringify(trackDiag)}`);
    await page.evaluate(() => {
      window.saveManager.setProgressField('trackedQuestId', 'club_join');
      window.saveManager.setProgressField('trackedQuestKind', 'side');
    });
    const beforeTrackSave = await page.evaluate(() => {
      const snap = window.saveManager.loadLocal();
      return JSON.stringify({ trackedQuestId: snap.progress.trackedQuestId, trackedQuestKind: snap.progress.trackedQuestKind });
    });
    console.log(`[诊断] 追踪任务后本地存储: ${beforeTrackSave}`);
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(500);
    const afterTrackLoad = await page.evaluate(() => {
      const snap = window.saveManager.loadLocal();
      return JSON.stringify({ trackedQuestId: snap.progress.trackedQuestId, trackedQuestKind: snap.progress.trackedQuestKind });
    });
    console.log(`[诊断] 刷新后本地存储: ${afterTrackLoad}`);
    const trackedId = await page.evaluate(() => window.saveManager.getProgressField('trackedQuestId'));
    console.log(`[检查] 追踪任务后刷新保留 trackedQuestId: ${trackedId === 'club_join'}`);

    await screenshot(SUCCESS_SCREENSHOT);

    if (jsErrors.length > 0) {
      console.warn(`[警告] 页面控制台出现 ${jsErrors.length} 个错误，但核心检查项已评估`);
    }

    if (!functionsOk || !allSideResolved || !mainResolved || !buyDone || !canteenDone || !exploreDone || !exploreRestored || trackedId !== 'club_join') {
      throw new Error('地图POI浏览器验收未全部通过');
    }

    console.log('[✅] test-map-poi.html 地图POI浏览器验收通过');
  } catch (e) {
    await fail(e.message);
  } finally {
    await browser.close();
    await stopServer();
  }
})();
