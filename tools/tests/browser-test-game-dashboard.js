const { chromium } = require('playwright');
const { spawn } = require('child_process');
const { join } = require('path');

const root = join(__dirname, '..', '..');

const PORT = process.env.PORT || '8080';
const BASE = (process.env.BROWSER_TEST_BASE || process.env.SMOKE_API_BASE || `http://localhost:${PORT}`).replace(/\/$/, '');
const URL = `${BASE}/tools/tests/test-game-dashboard.html`;
const ERROR_SCREENSHOT = join(__dirname, 'dashboard-error.png');

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

const testStartTime = Date.now();
let errorScreenshot = null;

async function run() {
  await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  let exitCode = 0;

  page.on('pageerror', err => console.error(`[PAGE ERROR] ${err.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error') console.error(`[PAGE CONSOLE ERROR] ${msg.text()}`);
    else console.log(`[PAGE CONSOLE] ${msg.type()}: ${msg.text()}`);
  });
  page.on('response', response => {
    if (response.status() >= 400) {
      console.error(`[HTTP ${response.status()}] ${response.url()}`);
    }
  });

  try {
    console.log(`[test:dashboard] 打开 ${URL}`);
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });

    await page.waitForFunction(() => {
      return window.dashboardTest && window.__testResults;
    }, { timeout: 30000 });

    const results = await page.evaluate(() => window.__testResults);
    if (!results) {
      throw new Error('未获取到测试结果');
    }

    if (results.passed) {
      console.log('[test:dashboard] ✅ 全部通过');
    } else {
      console.log('[test:dashboard] ❌ 未通过');
      for (const r of results.results) {
        if (!r.ok) console.log(`  - ${r.message}`);
      }
      errorScreenshot = ERROR_SCREENSHOT;
      try {
        await page.screenshot({ path: errorScreenshot, fullPage: true });
        console.log(`[test:dashboard] 已保存截图: ${errorScreenshot}`);
      } catch (e) {}
      exitCode = 1;
    }
  } catch (error) {
    console.error('[test:dashboard] 测试失败:', error.message);
    errorScreenshot = ERROR_SCREENSHOT;
    try {
      await page.screenshot({ path: errorScreenshot, fullPage: true });
      console.log(`[test:dashboard] 已保存错误截图: ${errorScreenshot}`);
    } catch (e) {}
    exitCode = 1;
  }

  await browser.close();
  await stopServer();

  const duration = Date.now() - testStartTime;
  console.log(`[test:dashboard] 耗时: ${duration}ms`);
  process.exit(exitCode);
}

run().catch(async (error) => {
  console.error('[test:dashboard] 运行异常:', error);
  await stopServer();
  process.exit(1);
});
