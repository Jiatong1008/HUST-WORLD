// 真实浏览器验收：/map 页面 NPC 交互
// 运行：node tools/tests/browser-test-npc-map.js
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const { join } = require('path');

const root = join(__dirname, '..', '..');

const PORT = process.env.PORT || '8080';
const BASE_URL = (process.env.BROWSER_TEST_BASE || process.env.SMOKE_API_BASE || `http://localhost:${PORT}`).replace(/\/$/, '');
const MAP_URL = `${BASE_URL}/map`;
const SUCCESS_SCREENSHOT = 'tools/tests/test-npc-map-result.png';
const ERROR_SCREENSHOT = 'tools/tests/test-npc-map-error.png';

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
  console.log(`[NPC地图浏览器验收] 启动 Chromium，访问 ${MAP_URL}`);
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  const jsErrors = [];
  page.on('console', msg => console.log(`[PAGE CONSOLE] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => { jsErrors.push(err.message); console.log(`[PAGE ERROR] ${err.message}`); });
  page.on('requestfailed', request => console.log(`[REQUEST FAILED] ${request.url()}: ${request.failure()?.errorText || 'unknown'}`));
  page.on('response', response => { if (response.status() >= 400) console.log(`[HTTP ${response.status()}] ${response.url()}`); });

  async function screenshot(path) {
    await page.screenshot({ path });
    console.log(`[截图] 已保存到 ${path}`);
  }
  async function fail(message) {
    console.error(`[❌] NPC 地图浏览器验收失败: ${message}`);
    await screenshot(ERROR_SCREENSHOT);
    await browser.close();
    await stopServer();
    process.exit(1);
  }

  try {
    await page.goto(MAP_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(500);
    const skipButton = await page.waitForSelector('#skipBtn', { state: 'visible', timeout: 10000 }).catch(() => null);
    if (skipButton) {
      await page.click('#skipBtn', { force: true });
      await page.waitForTimeout(800);
    }
    await page.waitForFunction(() => window._mapSystemReady === true, { timeout: 15000 }).catch(() => null);

    const mapReady = await page.evaluate(() => window._mapSystemReady === true);
    console.log(`[检查] 地图系统已就绪: ${mapReady}`);
    if (!mapReady) throw new Error('地图系统未就绪');

    const npcMapUIReady = await page.evaluate(() => typeof window.npcMapUI !== 'undefined');
    console.log(`[检查] NpcMapUI 已加载: ${npcMapUIReady}`);

    await page.waitForTimeout(500);
    const markerCount = await page.$$eval('#npc-map-marker-layer .npc-map-marker', markers => markers.length);
    console.log(`[检查] 当前视野 NPC 标记数量: ${markerCount}`);
    if (markerCount === 0) throw new Error('地图页没有渲染可见 NPC 标记');

    const avatarState = await page.$eval('#npc-map-marker-layer .npc-map-marker', marker => {
      const image = marker.querySelector('.npc-map-marker-avatar');
      const shell = marker.querySelector('.npc-map-marker-shell');
      return {
        loaded: Boolean(image?.complete && image.naturalWidth > 0),
        visible: Boolean(shell && getComputedStyle(shell).display !== 'none'),
        alt: image?.alt || ''
      };
    });
    console.log(`[检查] NPC 头像已加载: ${avatarState.loaded}, 名称: ${avatarState.alt}`);
    if (!avatarState.visible || !avatarState.loaded) throw new Error('NPC 图标头像未正确显示');

    const openDialogue = await page.evaluate(() => {
      if (!window.npcMapUI) return false;
      window.npcMapUI.openNpc('volunteer_freshman');
      return document.querySelector('.npc-dialogue-overlay')?.style.display === 'flex';
    });
    console.log(`[检查] 地图页打开 NPC 对话成功: ${openDialogue}`);
    if (!openDialogue) throw new Error('地图页无法打开 NPC 对话');

    await page.evaluate(() => window.npcMapUI?.dialogueUI?.close());

    const sceneNpc = await page.evaluate(() => {
      if (!window.mapSceneManager) return false;
      window.mapSceneManager.enterScene('library_inside');
      const avatar = document.querySelector('.scene-npc-avatar');
      return document.querySelector('.scene-npc-btn')?.textContent === '交谈'
        && Boolean(avatar?.complete && avatar.naturalWidth > 0);
    });
    console.log(`[检查] 室内场景 NPC 图标与交互正常: ${sceneNpc}`);
    if (!sceneNpc) throw new Error('室内场景 NPC 图标或交互不可用');

    await page.evaluate(() => window.mapSceneManager.returnToCampus());

    await screenshot(SUCCESS_SCREENSHOT);

    if (jsErrors.length > 0) console.warn(`[警告] 页面控制台出现 ${jsErrors.length} 个错误`);

    console.log('[✅] /map NPC 交互浏览器验收通过');
  } catch (e) {
    await fail(e.message);
  } finally {
    await browser.close();
    await stopServer();
  }
})();
