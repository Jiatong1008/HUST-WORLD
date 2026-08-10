// 真实浏览器验收：test-npc-dialogue.html
// 运行：node tools/tests/browser-test-npc-dialogue.js
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const { join } = require('path');

const root = join(__dirname, '..', '..');

const PORT = process.env.PORT || '8080';
const BASE_URL = (process.env.BROWSER_TEST_BASE || process.env.SMOKE_API_BASE || `http://localhost:${PORT}`).replace(/\/$/, '');
const TEST_URL = `${BASE_URL}/tools/tests/test-npc-dialogue.html`;
const SUCCESS_SCREENSHOT = 'tools/tests/test-npc-dialogue-result.png';
const ERROR_SCREENSHOT = 'tools/tests/test-npc-dialogue-error.png';

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
  console.log(`[NPC对话浏览器验收] 启动 Chromium，访问 ${TEST_URL}`);
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
    console.error(`[❌] NPC 对话浏览器验收失败: ${message}`);
    await screenshot(ERROR_SCREENSHOT);
    await browser.close();
    await stopServer();
    process.exit(1);
  }

  try {
    await page.goto(TEST_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(800);
    if (jsErrors.length > 0) throw new Error(`页面加载 JS 错误: ${jsErrors.join('; ')}`);

    const npcCount = await page.evaluate(() => window.debugListNpcs().length);
    console.log(`[检查] NPC 配置数量: ${npcCount}`);
    if (npcCount < 12) throw new Error('NPC 配置数量不足');

    const openOk = await page.evaluate(() => {
      window.debugOpenNpc('volunteer_freshman');
      return document.querySelector('.npc-dialogue-overlay')?.style.display === 'flex';
    });
    console.log(`[检查] 打开迎新志愿者对话成功: ${openOk}`);
    if (!openOk) throw new Error('无法打开 NPC 对话');

    await page.evaluate(() => window.npcDialogueUI.close());

    const dialogueCount = await page.evaluate(() => Object.keys(window.debugListNpcs()).length);
    console.log(`[检查] 调试函数可用，NPC 数: ${dialogueCount}`);

    await screenshot(SUCCESS_SCREENSHOT);

    if (jsErrors.length > 0) console.warn(`[警告] 页面控制台出现 ${jsErrors.length} 个错误`);

    console.log('[✅] test-npc-dialogue.html NPC 对话浏览器验收通过');
  } catch (e) {
    await fail(e.message);
  } finally {
    await browser.close();
    await stopServer();
  }
})();
