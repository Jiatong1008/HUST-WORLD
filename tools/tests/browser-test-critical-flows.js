const { chromium } = require('playwright');
const { spawnSync } = require('child_process');
const { join } = require('path');
const { startServer, stopServer } = require('./test-server-helper');

const PORT = process.env.PORT || '4000';
const BASE = (process.env.BROWSER_TEST_BASE || process.env.SMOKE_API_BASE || `http://localhost:${PORT}`).replace(/\/$/, '');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const root = join(__dirname, '..', '..');
const ERROR_SCREENSHOT = join(__dirname, 'critical-flows-error.png');

const username = `e2e_user_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
const password = 'E2eTest123!';

const checks = [];

function pass(message) {
  checks.push({ ok: true, message });
  console.log(`[test:e2e] PASS ${message}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
  pass(message);
}

function cleanupTestData() {
  const result = spawnSync(npmCommand, ['run', 'cleanup:smoke'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, PORT: String(PORT) },
    shell: process.platform === 'win32'
  });
  if (result.status !== 0) {
    console.warn(`[test:e2e] cleanup:smoke exited with ${result.status}`);
  }
}

function createPageErrorCollector(page, label) {
  const errors = [];
  page.on('pageerror', error => errors.push(`[${label}] ${error.message}`));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (text.includes('Failed to load resource') && text.includes('favicon')) return;
    errors.push(`[${label}] ${text}`);
  });
  page.on('response', response => {
    if (response.status() >= 400 && !response.url().includes('favicon')) {
      errors.push(`[${label}] HTTP ${response.status()} ${response.url()}`);
    }
  });
  return errors;
}

async function newPage(context, label) {
  const page = await context.newPage();
  const errors = createPageErrorCollector(page, label);
  page.__errors = errors;
  return page;
}

async function assertNoPageErrors(page, label) {
  assert(page.__errors.length === 0, `${label} has no browser errors: ${page.__errors.join('; ')}`);
}

async function gotoGame(page) {
  await page.goto(`${BASE}/game/index.html`, { waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForSelector('#start-screen', { timeout: 30000 });
  await page.waitForFunction(() => window.saveManager && window.sessionManager, null, { timeout: 30000 });
}

async function testGuestContinueFlow(context) {
  const page = await newPage(context, 'guest');
  const guestSnapshot = {
    version: '1',
    savedAt: new Date().toISOString(),
    mode: 'guest',
    character: {
      characterName: '游客E2E',
      college: '游客学院',
      gender: 'male',
      level: 2,
      experience: 120,
      money: 1234,
      stamina: 77,
      maxStamina: 100,
      social: 50,
      knowledge: 50,
      mood: 60,
      grade: 1,
      semester: 1,
      week: 1
    },
    gameTime: { day: 3, hour: 9, minute: 30 },
    position: { mapId: 1, x: 0, y: 0 },
    progress: { inventory: { coffee: 1 } },
    modules: {},
    settings: {}
  };
  await page.addInitScript((snapshot) => {
    localStorage.clear();
    localStorage.setItem('hust_world_save_v1', JSON.stringify(snapshot));
  }, guestSnapshot);
  await gotoGame(page);
  const guestState = await page.evaluate(() => {
    return {
      continueVisible: getComputedStyle(document.getElementById('btn-continue')).display !== 'none',
      savedInfo: document.getElementById('saved-info').textContent,
      status: document.getElementById('start-status-text').textContent
    };
  });

  assert(guestState.continueVisible, 'guest local save shows continue button');
  assert(guestState.savedInfo.includes('游客E2E'), 'guest local save information is rendered');
  assert(guestState.status.includes('游客模式'), 'guest start state is explicit');

  const loadedGuestSave = await page.evaluate(() => window.saveManager.loadLocal());
  assert(loadedGuestSave.character.characterName === '游客E2E', 'guest continue source loads saved character');
  await assertNoPageErrors(page, 'guest flow');
  await page.close();
}

async function testLoginCharacterRemoteSaveFlow(context) {
  const page = await newPage(context, 'login');
  await gotoGame(page);
  await page.waitForSelector('#btn-login', { timeout: 30000 });
  await page.waitForFunction(() => window.API && window.sessionManager, null, { timeout: 30000 });

  await page.evaluate(() => {
    document.getElementById('btn-login').dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true
    }));
  });
  await page.fill('#login-username', username);
  await page.fill('#login-password', password);
  await page.evaluate(() => {
    document.getElementById('btn-do-register').dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true
    }));
  });
  await page.waitForFunction(() => window.sessionManager && window.sessionManager.isLoggedIn(), null, { timeout: 30000 });

  const loginState = await page.evaluate(() => ({
    loggedIn: window.sessionManager.isLoggedIn(),
    hasCharacters: window.sessionManager.hasCharacters(),
    status: document.getElementById('start-status-text')?.textContent || ''
  }));
  assert(loginState.loggedIn, 'login/register flow stores session');
  assert(!loginState.hasCharacters, 'new login starts without characters');
  assert(loginState.status.includes('无角色'), 'start screen shows logged-in no-character state');

  const created = await page.evaluate(async () => {
    const user = window.sessionManager.getUser();
    const created = await window.API.createCharacter(user.userId, 'E2E同学', 'male', '计算机学院');
    const character = window.sessionManager.normalizeCharacter({
      ...created,
      userId: user.userId,
      characterName: 'E2E同学',
      gender: 'male',
      college: '计算机学院'
    });
    window.sessionManager.addCharacter(character);
    window.sessionManager.setCurrentCharacterId(character.characterId);
    window.sessionManager.saveSession();
    return {
      character,
      currentCharacterId: window.sessionManager.getCurrentCharacterId(),
      currentCharacter: window.sessionManager.getCurrentCharacter(),
      saveMode: window.saveManager.getMode()
    };
  });
  assert(created.currentCharacterId, 'frontend role creation stores currentCharacterId');
  assert(created.currentCharacter.characterName === 'E2E同学', 'frontend role creation updates SessionManager');
  assert(created.saveMode === 'loggedIn', 'SaveManager uses remote mode for logged-in character');

  await page.reload({ waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForFunction(() => window.sessionManager && window.sessionManager.getCurrentCharacterId(), null, { timeout: 30000 });

  const remoteSave = await page.evaluate(async () => {
    const current = window.sessionManager.getCurrentCharacter();
    const snapshot = window.saveManager.normalizeSnapshot({
      version: '1',
      savedAt: new Date().toISOString(),
      mode: 'loggedIn',
      character: {
        ...current,
        level: 5,
        experience: 650,
        money: 4321,
        stamina: 88,
        social: 67,
        knowledge: 79,
        mood: 81,
        grade: 2,
        semester: 1,
        week: 6
      },
      gameTime: { day: 12, hour: 15, minute: 20 },
      position: { mapId: 1, x: 222, y: 333 },
      progress: { trackedQuestId: 'freshman_arrival', inventory: { coffee: 2 } },
      modules: {},
      settings: {}
    });
    await window.saveManager.save(snapshot);
    const loaded = await window.saveManager.loadRemote();
    return {
      loadedLevel: loaded.character.level,
      loadedMoney: loaded.character.money,
      trackedQuestId: loaded.progress.trackedQuestId,
      localCharacterId: localStorage.getItem('hust_world_current_character_id')
    };
  });
  assert(remoteSave.loadedLevel === 5, 'remote save reloads updated level');
  assert(remoteSave.loadedMoney === 4321, 'remote save reloads updated money');
  assert(remoteSave.trackedQuestId === 'freshman_arrival', 'remote save preserves progress payload');
  assert(remoteSave.localCharacterId === String(created.currentCharacterId), 'currentCharacterId persists in localStorage');

  await page.reload({ waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForFunction(() => window.sessionManager && window.sessionManager.getCurrentCharacterId(), null, { timeout: 30000 });
  const restored = await page.evaluate(() => ({
    currentCharacterId: window.sessionManager.getCurrentCharacterId(),
    mode: window.saveManager.getMode()
  }));
  assert(restored.currentCharacterId === String(created.currentCharacterId), 'refresh restores currentCharacterId');
  assert(restored.mode === 'loggedIn', 'refresh keeps SaveManager in logged-in mode');

  await assertNoPageErrors(page, 'login flow');
  await page.close();
}

async function testMapExplorationFlow(context) {
  const page = await newPage(context, 'map');
  await page.goto(`${BASE}/map`, { waitUntil: 'networkidle', timeout: 40000 });
  await page.evaluate(() => {
    document.getElementById('panelToggle').dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true
    }));
  });
  await page.waitForSelector('#locList .loc-item', { timeout: 30000 });
  const beforeTitle = await page.textContent('#selTitle');
  await page.evaluate(() => {
    document.querySelector('#locList .loc-item').dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true
    }));
  });
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => ({
    beforeTitle: document.getElementById('selTitle')?.textContent || '',
    selectedTitle: document.getElementById('selTitle')?.textContent || '',
    selectedInfo: document.getElementById('selInfo')?.textContent || '',
    locCount: document.querySelectorAll('#locList .loc-item').length
  }));
  assert(after.locCount > 0, 'map location list renders POIs');
  assert(after.selectedTitle && after.selectedTitle !== beforeTitle, 'map POI click updates selected location panel');
  assert(after.selectedInfo.length > 0, 'map selected location shows detail text');
  await assertNoPageErrors(page, 'map flow');
  await page.close();
}

async function testQuestAndShopFlow(context) {
  const questPage = await newPage(context, 'quest');
  await questPage.goto(`${BASE}/tools/tests/test-quest-system.html`, { waitUntil: 'networkidle', timeout: 40000 });
  await questPage.waitForFunction(() => window.questDebug && window.questManager, null, { timeout: 30000 });
  const questResult = await questPage.evaluate(async () => {
    window.questDebug.resetQuestSystem();
    window.questDebug.selectQuest('freshman_arrival');
    const accept = await window.questDebug.acceptSelectedQuest();
    await window.questDebug.advanceSelectedQuest();
    const complete = await window.questDebug.completeSelectedQuest();
    const progress = window.questDebug.exportProgress();
    return {
      accept,
      complete,
      completed: progress.completedQuests?.includes('freshman_arrival') || progress.mainQuests?.completed?.includes('freshman_arrival'),
      exportedKeys: Object.keys(progress || {}).length
    };
  });
  assert(questResult.accept?.success, 'quest debug accepts main quest');
  assert(questResult.complete?.success, 'quest debug completes main quest');
  assert(questResult.completed || questResult.exportedKeys > 0, 'quest progress export records quest state');
  await assertNoPageErrors(questPage, 'quest flow');
  await questPage.close();

  const shopPage = await newPage(context, 'shop');
  await shopPage.goto(`${BASE}/tools/tests/test-npc-dialogue.html`, { waitUntil: 'networkidle', timeout: 40000 });
  await shopPage.waitForFunction(() => typeof window.debugBuyItem === 'function', null, { timeout: 30000 });
  const shopResult = await shopPage.evaluate(() => {
    window.saveManager.setProgressField('money', 1000);
    window.saveManager.setProgressField('items', {});
    const result = window.debugBuyItem('shopkeeper', 'coffee');
    const progress = window.debugExportNpcProgress();
    return {
      result,
      money: progress.money,
      coffee: progress.items?.coffee || 0
    };
  });
  assert(shopResult.result.success, 'shop debug purchase succeeds with enough money');
  assert(shopResult.coffee === 1, 'shop purchase immediately updates inventory');
  assert(shopResult.money < 1000, 'shop purchase deducts money');
  await assertNoPageErrors(shopPage, 'shop flow');
  await shopPage.close();
}

async function run() {
  console.log(`[test:e2e] Starting critical frontend flow E2E at ${BASE}`);
  cleanupTestData();
  await startServer(PORT);

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const guestContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await testGuestContinueFlow(guestContext);
    await guestContext.close();

    const loginContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await testLoginCharacterRemoteSaveFlow(loginContext);
    await loginContext.close();

    const mapContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await testMapExplorationFlow(mapContext);
    await mapContext.close();

    const questContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await testQuestAndShopFlow(questContext);
    await questContext.close();
  } catch (error) {
    console.error(`[test:e2e] FAILED ${error.message}`);
    if (browser) {
      const pages = browser.contexts().flatMap(context => context.pages());
      const page = pages[pages.length - 1];
      if (page) {
        try {
          await page.screenshot({ path: ERROR_SCREENSHOT, fullPage: true });
          console.error(`[test:e2e] Error screenshot saved: ${ERROR_SCREENSHOT}`);
        } catch {}
      }
    }
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    await stopServer();
    cleanupTestData();
  }

  const passed = checks.filter(check => check.ok).length;
  console.log(`[test:e2e] Summary: ${passed}/${checks.length} checks passed`);
  if (process.exitCode) return;
  console.log('[test:e2e] ALL PASSED');
}

run();
