const { chromium } = require('playwright');
const { startServer, stopServer } = require('./test-server-helper');

const port = process.env.PORT || '8080';
const base = (process.env.BROWSER_TEST_BASE || `http://localhost:${port}`).replace(/\/$/, '');

async function run() {
  await startServer(port);
  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/tools/tests/test-four-year-lifecycle.html`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForFunction(() => window.__testResults, { timeout: 30000 });
    const outcome = await page.evaluate(() => window.__testResults);
    await browser.close();
    if (errors.length) throw new Error(`页面错误：${errors.join('; ')}`);
    if (!outcome.passed) throw new Error(outcome.results.filter(result => !result.ok).map(result => result.message).join('; '));
    console.log(`[test:four-year] ${outcome.results.length}/${outcome.results.length} checks passed`);
  } finally {
    await stopServer();
  }
}

run().catch(error => {
  console.error(`[test:four-year] failed: ${error.message}`);
  process.exitCode = 1;
});
