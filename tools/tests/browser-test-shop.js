// 真实浏览器验收：商店购买
// 运行：node tools/tests/browser-test-shop.js
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const { join } = require('path');

const root = join(__dirname, '..', '..');

const PORT = process.env.PORT || '8080';
const BASE_URL = (process.env.BROWSER_TEST_BASE || process.env.SMOKE_API_BASE || `http://localhost:${PORT}`).replace(/\/$/, '');
const TEST_URL = `${BASE_URL}/tools/tests/test-npc-dialogue.html`;
const SUCCESS_SCREENSHOT = 'tools/tests/test-shop-result.png';
const ERROR_SCREENSHOT = 'tools/tests/test-shop-error.png';

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
  console.log(`[商店浏览器验收] 启动 Chromium，访问 ${TEST_URL}`);
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
    console.error(`[❌] 商店浏览器验收失败: ${message}`);
    await screenshot(ERROR_SCREENSHOT);
    await browser.close();
    await stopServer();
    process.exit(1);
  }

  try {
    await page.goto(TEST_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(800);
    if (jsErrors.length > 0) throw new Error(`页面加载 JS 错误: ${jsErrors.join('; ')}`);

    const items = await page.evaluate(() => {
      return window.debugListNpcs().filter(n => n.shopId).length;
    });
    console.log(`[检查] 商店 NPC 数量: ${items}`);
    if (items < 1) throw new Error('未找到商店 NPC');

    const buySuccess = await page.evaluate(async () => {
      window.debugResetNpcProgress();
      const progress = window.saveManager.getProgress();
      window.saveManager.setProgressField('money', 100);
      const result = window.debugBuyItem('shopkeeper', 'coffee');
      return result.success;
    });
    console.log(`[检查] 金币足够时购买咖啡成功: ${buySuccess}`);
    if (!buySuccess) throw new Error('购买咖啡失败');

    const itemsAfter = await page.evaluate(() => {
      const progress = window.saveManager.getProgress();
      return progress.items?.coffee || 0;
    });
    console.log(`[检查] 购买后 coffee 数量: ${itemsAfter}`);
    if (itemsAfter !== 1) throw new Error('购买后物品数量不正确');

    const failResult = await page.evaluate(() => {
      window.saveManager.setProgressField('money', 0);
      return window.debugBuyItem('shopkeeper', 'coffee');
    });
    console.log(`[检查] 金币不足时购买失败: ${!failResult.success}`);
    if (failResult.success) throw new Error('金币不足时不应购买成功');

    const progressAfter = await page.evaluate(() => window.saveManager.getProgress());
    console.log(`[检查] 购买后 items 保留: ${(progressAfter.items?.coffee || 0) === 1}`);
    if ((progressAfter.items?.coffee || 0) !== 1) throw new Error('刷新前物品未保留');

    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(800);
    const restored = await page.evaluate(() => window.saveManager.getProgress());
    console.log(`[检查] 刷新后 items 保留: ${(restored.items?.coffee || 0) === 1}`);
    if ((restored.items?.coffee || 0) !== 1) throw new Error('刷新后物品未保留');

    await screenshot(SUCCESS_SCREENSHOT);

    if (jsErrors.length > 0) console.warn(`[警告] 页面控制台出现 ${jsErrors.length} 个错误`);

    console.log('[✅] 商店浏览器验收通过');
  } catch (e) {
    await fail(e.message);
  } finally {
    await browser.close();
    await stopServer();
  }
})();
