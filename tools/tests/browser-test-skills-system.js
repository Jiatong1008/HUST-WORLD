// 真实浏览器验收：test-skills-system.html
// 运行：node tools/tests/browser-test-skills-system.js
const { chromium } = require('playwright');
const { startServer, stopServer } = require('./test-server-helper.js');

const PORT = process.env.PORT || '8080';
const BASE_URL = (process.env.BROWSER_TEST_BASE || process.env.SMOKE_API_BASE || `http://localhost:${PORT}`).replace(/\/$/, '');
const TEST_URL = `${BASE_URL}/tools/tests/test-skills-system.html`;
const SUCCESS_SCREENSHOT = 'tools/tests/test-skills-system-result.png';
const ERROR_SCREENSHOT = 'tools/tests/test-skills-system-error.png';

(async () => {
  await startServer(PORT);
  console.log(`[技能与熟练度浏览器验收] 启动 Chromium，访问 ${TEST_URL}`);
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
    await page.waitForTimeout(600);

    if (jsErrors.length > 0) {
      throw new Error(`页面加载出现 JS 错误: ${jsErrors.join('; ')}`);
    }
    console.log('[检查] 页面加载无 JS 错误');

    const initOk = await page.evaluate(() => {
      return !!window.questManager && !!window.saveManager;
    });
    console.log(`[检查] 全局对象挂载: ${initOk}`);
    if (!initOk) throw new Error('questManager / saveManager 未挂载');

    const skillList = await page.evaluate(() => window.questManager.getSkills().map(s => ({ id: s.id, name: s.name, category: s.category })));
    console.log('[检查] 技能列表数量:', skillList.length);
    if (skillList.length !== 8) throw new Error('初始技能列表数量应为 8');
    const hasMathFocus = skillList.some(s => s.id === 'math_focus');
    if (!hasMathFocus) throw new Error('缺少 math_focus 技能');

    const initialState = await page.evaluate(() => {
      const s = window.questManager.getSkill('math_focus');
      return { unlocked: s.unlocked, level: s.level, exp: s.exp };
    });
    console.log('[检查] math_focus 初始状态:', initialState);
    if (initialState.unlocked) throw new Error('math_focus 初始状态应为未解锁');
    if (initialState.level !== 1) throw new Error('math_focus 初始等级异常');

    await page.click('button[onclick="window.unlockMathFocus()"]');
    await page.waitForTimeout(300);
    const afterUnlock = await page.evaluate(() => {
      const s = window.questManager.getSkill('math_focus');
      return { unlocked: s.unlocked, level: s.level, exp: s.exp };
    });
    console.log('[检查] 解锁 math_focus 后:', afterUnlock);
    if (!afterUnlock.unlocked) throw new Error('math_focus 解锁失败');

    await page.click('button[onclick="window.addMathFocusExp()"]');
    await page.waitForTimeout(300);
    const afterExp = await page.evaluate(() => {
      const s = window.questManager.getSkill('math_focus');
      return { exp: s.exp };
    });
    console.log('[检查] +100 经验后:', afterExp);
    if (afterExp.exp < 100) throw new Error('math_focus 经验增加失败');

    await page.click('button[onclick="window.levelUpMathFocus()"]');
    await page.waitForTimeout(300);
    const afterLevelUp = await page.evaluate(() => {
      const s = window.questManager.getSkill('math_focus');
      return { level: s.level, exp: s.exp };
    });
    console.log('[检查] 升级后:', afterLevelUp);
    if (afterLevelUp.level < 2) throw new Error('math_focus 升级失败');

    const maxLevel = await page.evaluate(() => window.questManager.getSkill('math_focus').maxLevel);
    await page.evaluate((maxLevel) => {
      window.questManager.skills.entries['math_focus'].exp = 99999;
      window.questManager.skills.entries['math_focus'].level = maxLevel + 1;
    }, maxLevel);
    await page.evaluate(() => {
      window.questManager.addSkillExp('math_focus', 0, 'test');
    });
    const afterOverflow = await page.evaluate(() => {
      const s = window.questManager.getSkill('math_focus');
      return { level: s.level };
    });
    console.log('[检查] 经验溢出后等级上限:', afterOverflow);
    if (afterOverflow.level > maxLevel) throw new Error('等级未正确限制在 maxLevel');

    await page.click('button[onclick="window.unlockEnduranceTraining()"]');
    await page.click('button[onclick="window.unlockCampusObservation()"]');
    await page.click('button[onclick="window.unlockLibraryResearch()"]');
    await page.waitForTimeout(300);
    const effectSummary = await page.evaluate(() => window.questManager.getSkillSummary());
    console.log('[检查] 加成汇总:', effectSummary.effects);
    if (typeof effectSummary.effects.examBonus !== 'number') throw new Error('examBonus 加成汇总异常');
    if (typeof effectSummary.effects.runningBonus !== 'number') throw new Error('runningBonus 加成汇总异常');

    await page.click('button[onclick="window.simulateExamQuest()"]');
    await page.waitForTimeout(300);
    const examResult = await page.evaluate(() => {
      const s = window.questManager.getSkill('math_focus');
      return { exp: s.exp };
    });
    console.log('[检查] 考试类任务联动后 math_focus exp:', examResult.exp);
    if (examResult.exp <= afterOverflow.level) throw new Error('考试类任务未给 math_focus 增加经验');

    await page.click('button[onclick="window.simulateRunQuest()"]');
    await page.waitForTimeout(300);
    const runResult = await page.evaluate(() => {
      const s = window.questManager.getSkill('endurance_training');
      return { exp: s.exp };
    });
    console.log('[检查] 跑步类任务联动后 endurance_training exp:', runResult.exp);
    if (runResult.exp <= 0) throw new Error('跑步类任务未给 endurance_training 增加经验');

    const beforeSave = await page.evaluate(() => {
      const s = window.questManager.getSkill('math_focus');
      return { level: s.level, exp: s.exp };
    });
    await page.click('button[onclick="window.saveAndRefresh()"]');
    await page.waitForTimeout(1500);
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.waitForTimeout(600);

    const afterRefresh = await page.evaluate(() => {
      const s = window.questManager.getSkill('math_focus');
      return { level: s.level, exp: s.exp };
    });
    console.log('[检查] 保存并刷新前后:', beforeSave, '->', afterRefresh);
    if (afterRefresh.level !== beforeSave.level) throw new Error('刷新后技能等级未保留');
    if (afterRefresh.exp !== beforeSave.exp) throw new Error('刷新后技能经验未保留');

    await page.evaluate(() => {
      if (window.saveManager) {
        window.saveManager.save = () => Promise.resolve(null);
        window.saveManager.saveLocal = () => {};
        window.saveManager.saveLocalSync = () => null;
      }
      const saveKey = 'hust_world_save_v1';
      const snapshot = {
        version: '1',
        savedAt: new Date().toISOString(),
        mode: 'guest',
        character: {
          characterId: null,
          characterName: '游客',
          gender: 'unknown',
          college: '计算机科学与技术学院',
          level: 1,
          experience: 0,
          money: 1000,
          stamina: 100,
          maxStamina: 100,
          social: 50,
          knowledge: 50,
          mood: 50,
          grade: 1,
          semester: 1,
          week: 1
        },
        gameTime: { day: 1, hour: 8, minute: 0 },
        position: { mapId: 1, x: 0, y: 0 },
        progress: {
          currentPhaseIndex: 0,
          activeQuest: null,
          completedQuests: ['math_intro', 'self_study_library_1'],
          questStatus: {},
          visitedLocations: [],
          unlockedSubjects: [],
          unlockedSkills: ['math_focus', 'library_research', 'endurance_training'],
          proficiencies: {},
          gameTime: { day: 1, hour: 8 },
          stats: { level: 1, experience: 0, money: 1000, stamina: 100, social: 50, knowledge: 50, mood: 50 }
        },
        modules: {},
        settings: {}
      };
      localStorage.setItem(saveKey, JSON.stringify(snapshot));
    });

    jsErrors.length = 0;
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(600);
    if (jsErrors.length > 0) {
      throw new Error(`旧 unlockedSkills 迁移后页面出现 JS 错误: ${jsErrors.join('; ')}`);
    }
    const migratedUnlocked = await page.evaluate(() => window.questManager.getSkills().filter(s => s.unlocked).map(s => s.id));
    console.log('[检查] 旧 unlockedSkills 迁移后已解锁技能:', migratedUnlocked);
    if (!migratedUnlocked.includes('math_focus')) throw new Error('旧 unlockedSkills 未迁移为 skills.unlocked');
    if (!migratedUnlocked.includes('library_research')) throw new Error('旧 unlockedSkills 未迁移 library_research');
    if (!migratedUnlocked.includes('endurance_training')) throw new Error('旧 unlockedSkills 未迁移 endurance_training');

    await page.evaluate(() => {
      if (window.saveManager) {
        window.saveManager.save = () => Promise.resolve(null);
        window.saveManager.saveLocal = () => {};
        window.saveManager.saveLocalSync = () => null;
      }
      const saveKey = 'hust_world_save_v1';
      const snapshot = JSON.parse(localStorage.getItem(saveKey));
      snapshot.progress = {
        proficiencies: {
          '高等数学': { level: 3, points: 350 },
          '专业必修课1': { level: 2, points: 150 }
        }
      };
      localStorage.setItem(saveKey, JSON.stringify(snapshot));
    });

    jsErrors.length = 0;
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(600);
    if (jsErrors.length > 0) {
      throw new Error(`旧 proficiencies 迁移后页面出现 JS 错误: ${jsErrors.join('; ')}`);
    }
    const migratedProfSkills = await page.evaluate(() => {
      const unlocked = window.questManager.getSkills().filter(s => s.unlocked).map(s => s.id);
      const mathFocus = window.questManager.getSkill('math_focus');
      const libraryResearch = window.questManager.getSkill('library_research');
      return { unlocked, mathFocus: { exp: mathFocus.exp, level: mathFocus.level }, libraryResearch: { exp: libraryResearch.exp, level: libraryResearch.level } };
    });
    console.log('[检查] 旧 proficiencies 迁移后:', migratedProfSkills);
    if (!migratedProfSkills.unlocked.includes('math_focus')) throw new Error('旧 proficiencies 未迁移 math_focus');
    if (!migratedProfSkills.unlocked.includes('library_research')) throw new Error('旧 proficiencies 未迁移 library_research');
    if (migratedProfSkills.mathFocus.exp < 350) throw new Error('math_focus 迁移经验不足');
    if (migratedProfSkills.mathFocus.level < 3) throw new Error('math_focus 迁移等级不足');

    await screenshot(SUCCESS_SCREENSHOT);

    console.log('[✅] test-skills-system.html 技能与熟练度浏览器验收通过');
  } catch (e) {
    await fail(e.message);
  } finally {
    await browser.close();
    await stopServer();
  }
})();
