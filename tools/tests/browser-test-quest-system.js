// 真实浏览器验收：test-quest-system.html
// 运行：node tools/tests/browser-test-quest-system.js
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const { join } = require('path');

const root = join(__dirname, '..', '..');

const PORT = process.env.PORT || '8080';
const BASE_URL = (process.env.BROWSER_TEST_BASE || process.env.SMOKE_API_BASE || `http://localhost:${PORT}`).replace(/\/$/, '');
const TEST_URL = `${BASE_URL}/tools/tests/test-quest-system.html`;
const SUCCESS_SCREENSHOT = 'tools/tests/test-quest-system-result.png';
const ERROR_SCREENSHOT = 'tools/tests/test-quest-system-error.png';

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
  console.log(`[任务系统浏览器验收] 启动 Chromium，访问 ${TEST_URL}`);
  const browser = await chromium.launch({
    headless: true,
    channel: 'msedge'
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  const jsErrors = [];
  page.on('console', msg => {
    console.log(`[PAGE CONSOLE] ${msg.type()}: ${msg.text()}`);
  });
  page.on('pageerror', err => {
    jsErrors.push(err.message);
    console.log(`[PAGE ERROR] ${err.message}`);
  });
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`[HTTP ${response.status()}] ${response.url()}`);
    }
  });

  async function screenshot(path) {
    await page.screenshot({ path });
    console.log(`[截图] 已保存到 ${path}`);
  }

  async function fail(message) {
    console.error(`[❌] 浏览器验收失败: ${message}`);
    await screenshot(ERROR_SCREENSHOT);
    await browser.close();
    await stopServer();
    process.exit(1);
  }

  try {
    await page.goto(TEST_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(500);

    if (jsErrors.length > 0) {
      throw new Error(`页面加载出现 JS 错误: ${jsErrors.join('; ')}`);
    }
    console.log('[检查] 页面加载无 JS 错误');

    const initOk = await page.evaluate(() => {
      return !!window.questManager && !!window.saveManager && !!window.questDebug;
    });
    console.log(`[检查] 全局对象挂载: ${initOk}`);
    if (!initOk) throw new Error('全局对象未挂载');

    const result = await page.evaluate(() => {
      try {
        window.questDebug.selectQuest('freshman_arrival');
        const acceptResult = window.questDebug.acceptSelectedQuest();
        return {
          acceptedResult: acceptResult,
          status: window.questManager.questStatus['freshman_arrival']
        };
      } catch (e) {
        return { error: e.message };
      }
    });
    console.log(`[检查] freshman_arrival 状态: ${JSON.stringify(result)}`);
    if (result.error) throw new Error(`任务状态异常: ${result.error}`);
    if (!['ACTIVE', 'COMPLETED', 'READY_TO_COMPLETE'].includes(result.status)) throw new Error('freshman_arrival 未能进入可执行状态');

    await screenshot(SUCCESS_SCREENSHOT);
    console.log('[✅] test-quest-system.html 任务系统浏览器验收通过');
  } catch (e) {
    await fail(e.message);
  } finally {
    await browser.close();
    await stopServer();
  }
})();
