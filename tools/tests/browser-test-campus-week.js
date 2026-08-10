const { chromium } = require('playwright');
const { spawn } = require('child_process');
const { join } = require('path');

const root = join(__dirname, '..', '..');
const port = process.env.PORT || '8080';
const base = (process.env.BROWSER_TEST_BASE || `http://localhost:${port}`).replace(/\/$/, '');
let server;

function startServer() {
  return new Promise((resolve, reject) => {
    server = spawn(process.execPath, ['server.js'], { cwd: root, env: { ...process.env, PORT: String(port) } });
    server.stdout.on('data', data => { process.stdout.write(data); if (data.toString().includes(`http://localhost:${port}`)) resolve(); });
    server.stderr.on('data', data => process.stderr.write(data));
    server.on('error', reject);
    setTimeout(resolve, 5000);
  });
}

function stopServer() {
  return new Promise(resolve => {
    if (!server) return resolve();
    server.once('close', resolve);
    server.kill('SIGTERM');
    setTimeout(resolve, 2500);
  });
}

async function run() {
  try {
    await startServer();
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('pageerror', error => console.error(`[PAGE ERROR] ${error.message}`));
    await page.goto(`${base}/tools/tests/test-campus-week.html`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForFunction(() => window.__testResults, { timeout: 30000 });
    const results = await page.evaluate(() => window.__testResults);
    await browser.close();
    if (!results.passed) throw new Error(results.results.filter(result => !result.ok).map(result => result.message).join('; '));
    console.log(`[test:campus-week] ✅ ${results.results.length}/${results.results.length} checks passed`);
  } finally { await stopServer(); }
}

run().catch(error => { console.error(`[test:campus-week] ❌ ${error.message}`); process.exitCode = 1; });
