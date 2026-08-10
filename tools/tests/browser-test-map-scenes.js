// 真实浏览器验收：地图室内场景
// 运行：node tools/tests/browser-test-map-scenes.js
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const { join } = require('path');

const root = join(__dirname, '..', '..');

const PORT = process.env.PORT || '8080';
const BASE_URL = (process.env.BROWSER_TEST_BASE || process.env.SMOKE_API_BASE || `http://localhost:${PORT}`).replace(/\/$/, '');
const MAP_URL = `${BASE_URL}/map`;
const SUCCESS_SCREENSHOT = 'tools/tests/test-map-scenes-result.png';
const ERROR_SCREENSHOT = 'tools/tests/test-map-scenes-error.png';

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
  console.log(`[地图场景浏览器验收] 启动 Chromium，访问 ${MAP_URL}`);
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  const jsErrors = [];
  page.on('console', msg => console.log(`[PAGE CONSOLE] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => { jsErrors.push(err.message); console.log(`[PAGE ERROR] ${err.message}`); });
  page.on('response', response => { if (response.status() >= 400) console.log(`[HTTP ${response.status()}] ${response.url()}`); });

  async function screenshot(path) {
    await page.screenshot({ path });
    console.log(`[截图] 已保存到 ${path}`);
  }
  async function fail(message) {
    console.error(`[❌] 地图场景浏览器验收失败: ${message}`);
    await screenshot(ERROR_SCREENSHOT);
    await browser.close();
    await stopServer();
    process.exit(1);
  }

  async function skipGenderAndWaitForMapReady() {
    const genderMale = await page.waitForSelector('#genderMale', { state: 'visible', timeout: 10000 }).catch(() => null);
    if (genderMale) {
      await page.click('#genderMale', { force: true });
      await page.fill('#characterName', '测试角色');
      await page.click('#skipBtn', { force: true });
    }
    await page.waitForFunction(() => window._mapSystemReady === true, { timeout: 30000 });

    await page.evaluate(async () => {
      if (window.questTriggerUI) return true;
      try {
        const [{ QuestTriggerUI }] = await Promise.all([
          import('/game/js/ui/QuestTriggerUI.js')
        ]);
        if (!window.timeSystem) {
          const time = { year: 2024, semester: 1, week: 1, day: 1, hour: 8, minute: 0 };
          window.timeSystem = {
            getGameTime: () => ({ ...time }),
            getTime: () => ({ ...time }),
            setTime: (next = {}) => Object.assign(time, next),
            advanceTimeByMinutes: () => {}
          };
        }
        if (!window.questTriggerManager) {
          const mod = await import('/game/js/managers/QuestTriggerManager.js');
          window.questTriggerManager = mod.default || new mod.QuestTriggerManager();
        }
        window.questTriggerUI = new QuestTriggerUI();
        window.questTriggerUI.init?.();
        return true;
      } catch (e) {
        console.error('注入任务 UI 失败:', e.message);
        return false;
      }
    });
  }

  try {
    await page.goto(MAP_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(500);
    await skipGenderAndWaitForMapReady();
    console.log('[检查] /map 页面已加载且地图系统就绪');

    const uiLoad = await page.evaluate(async () => {
      try {
        const mod = await import('/map/js/features/NpcMapUI.js?v=2');
        return { ok: true, exports: Object.keys(mod) };
      } catch (e) {
        return { ok: false, error: e.message, stack: e.stack };
      }
    });
    console.log(`[诊断] 动态导入 NpcMapUI: ${JSON.stringify(uiLoad)}`);

    const scripts = await page.evaluate(() => Array.from(document.querySelectorAll('script')).map(s => s.src || s.type));
    console.log(`[诊断] 页面 scripts: ${JSON.stringify(scripts)}`);

    const modulesOk = await page.evaluate(() => {
      return !!window._mapData && !!window._renderer && !!window._character;
    });
    console.log(`[检查] 地图核心模块已挂载: ${modulesOk}`);

    await page.evaluate(() => { if (window.mapSceneManager) window.mapSceneManager.enterScene('library_inside'); });
    await page.waitForTimeout(500);
    const inLibrary = await page.evaluate(() => window.mapSceneManager?.currentSceneId === 'library_inside');
    console.log(`[检查] 进入 library_inside: ${inLibrary}`);

    const libraryVisible = await page.$eval('#map-scene-overlay', el => el.style.display !== 'none');
    console.log(`[检查] 室内场景 overlay 已显示: ${libraryVisible}`);

    await page.evaluate(() => { if (window.mapSceneManager) window.mapSceneManager.returnToCampus(); });
    await page.waitForTimeout(500);
    const backToCampus = await page.evaluate(() => window.mapSceneManager?.currentSceneId === 'campus');
    console.log(`[检查] 返回 campus: ${backToCampus}`);

    await page.evaluate(() => { if (window.mapSceneManager) window.mapSceneManager.enterScene('dorm_inside'); });
    await page.waitForTimeout(500);
    const inDorm = await page.evaluate(() => window.mapSceneManager?.currentSceneId === 'dorm_inside');
    console.log(`[检查] 进入 dorm_inside: ${inDorm}`);

    await page.evaluate(() => { if (window.mapSceneManager) window.mapSceneManager.returnToCampus(); });
    await page.waitForTimeout(500);
    const backToCampus2 = await page.evaluate(() => window.mapSceneManager?.currentSceneId === 'campus');
    console.log(`[检查] 再次返回 campus: ${backToCampus2}`);

    await page.evaluate(() => { if (window.mapSceneManager) window.mapSceneManager.enterScene('classroom_inside'); });
    await page.evaluate(() => { if (window.saveManager) window.saveManager.setProgressField('currentSceneId', 'classroom_inside'); });
    const rawBefore = await page.evaluate(() => localStorage.getItem('hust_world_save_v1'));
    console.log(`[诊断] 设置 currentSceneId 后 localStorage 前 300 字符: ${rawBefore?.slice(0, 300)}`);
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(500);
    await skipGenderAndWaitForMapReady();
    const rawAfter = await page.evaluate(() => localStorage.getItem('hust_world_save_v1'));
    console.log(`[诊断] 刷新后 localStorage 前 300 字符: ${rawAfter?.slice(0, 300)}`);
    const restoredScene = await page.evaluate(() => window.mapSceneManager?.currentSceneId);
    console.log(`[检查] 刷新后恢复场景: ${restoredScene}`);

    await page.evaluate(() => { if (window.mapSceneManager) window.mapSceneManager.enterScene('library_inside'); });
    await page.waitForTimeout(300);
    const hasUI = await page.evaluate(() => !!window.questTriggerUI);
    console.log(`[检查] questTriggerUI 已加载: ${hasUI}`);
    await page.click('body', { position: { x: 20, y: 20 } }).catch(() => {});
    await page.keyboard.press('KeyJ');
    await page.waitForTimeout(500);
    let questLogVisible = await page.evaluate(() => {
      const el = document.getElementById('quest-status-bar');
      return el ? getComputedStyle(el).display !== 'none' : false;
    });
    if (!questLogVisible) {
      await page.evaluate(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'j',
          code: 'KeyJ',
          bubbles: true,
          cancelable: true
        }));
      });
      await page.waitForTimeout(300);
      questLogVisible = await page.evaluate(() => {
        const el = document.getElementById('quest-status-bar');
        return el ? getComputedStyle(el).display !== 'none' : false;
      });
    }
    console.log(`[检查] 室内场景 J 键任务日志通道可用: ${questLogVisible}`);

    await screenshot(SUCCESS_SCREENSHOT);

    if (jsErrors.length > 0) console.warn(`[警告] 页面控制台出现 ${jsErrors.length} 个错误`);

    if (!modulesOk || !inLibrary || !libraryVisible || !backToCampus || !inDorm || !backToCampus2 || restoredScene !== 'classroom_inside' || !questLogVisible) {
      throw new Error('地图场景浏览器验收未全部通过');
    }

    console.log('[✅] /map 室内场景浏览器验收通过');
  } catch (e) {
    await fail(e.message);
  } finally {
    await browser.close();
    await stopServer();
  }
})();
