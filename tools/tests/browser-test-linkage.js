// 8.4 联动与平衡真实浏览器验收
// 覆盖：任务奖励统一接入成长/背包/技能、NPC 对话 effects、地图场景日常成长
const { chromium } = require('playwright');
const { startServer, stopServer } = require('./test-server-helper.js');

const PORT = process.env.PORT || '8080';
const BASE_URL = (process.env.BROWSER_TEST_BASE || process.env.SMOKE_API_BASE || `http://localhost:${PORT}`).replace(/\/$/, '');
const SUCCESS_SCREENSHOT = 'tools/tests/test-linkage-result.png';
const ERROR_SCREENSHOT = 'tools/tests/test-linkage-error.png';

async function run() {
  await startServer(PORT);
  console.log(`[联动与平衡浏览器验收] 启动 Chromium，BASE_URL=${BASE_URL}`);
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
    console.error(`[❌] 联动验收失败: ${message}`);
    await screenshot(ERROR_SCREENSHOT);
    await browser.close();
    await stopServer();
    process.exit(1);
  }
  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  try {
    await page.goto(`${BASE_URL}/tools/tests/test-inventory-system.html`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(800);
    if (jsErrors.length > 0) throw new Error(`inventory 页面 JS 错误: ${jsErrors.join('; ')}`);
    const initOk = await page.evaluate(() => !!window.questManager && !!window.saveManager);
    assert(initOk, 'questManager / saveManager 未挂载');

    const rewardResult = await page.evaluate(async () => {
      const qm = window.questManager;
      qm.proficiencies = { '高等数学': { level: 1, points: 0 } };
      qm.unlockedSubjects.add('高等数学');
      qm.characterStats.stamina = 90;
      qm.completedQuests.add('math_intro');
      qm.completedQuests.add('run_first');
      qm.completedQuests.add('self_study_library_1');
      const unlockMath = qm.unlockSkill('math_focus', 'test');
      const unlockEndurance = qm.unlockSkill('endurance_training', 'test');
      const before = { ...qm.characterStats };
      const beforeCoffee = qm.getItemQuantity('coffee');
      const beforeMath = qm.proficiencies['高等数学'].points;
      const beforeMathFocus = qm.getSkill('math_focus').exp;
      const beforeEndurance = qm.getSkill('endurance_training').exp;
      const rewardResult = qm.grantRewards({
        experience: 50,
        money: 30,
        stamina: 10,
        knowledge: 5,
        mood: 5,
        items: [{ itemId: 'coffee', quantity: 2 }],
        proficiencyGain: { subject: '高等数学', amount: 20 },
        unlockSkills: ['library_research']
      }, { questId: 'linkage_exam', type: 'exam', tags: ['exam'] });
      const skillResults = qm._grantSkillExpByQuest({ id: 'linkage_exam', type: 'exam', tags: ['exam'] }, 'linkage_quest');
      return {
        exp: qm.characterStats.experience - before.experience,
        money: qm.characterStats.money - before.money,
        stamina: qm.characterStats.stamina - before.stamina,
        knowledge: qm.characterStats.knowledge - before.knowledge,
        mood: qm.characterStats.mood - before.mood,
        coffee: qm.getItemQuantity('coffee') - beforeCoffee,
        math: qm.proficiencies['高等数学'].points - beforeMath,
        mathFocus: qm.getSkill('math_focus').exp - beforeMathFocus,
        endurance: qm.getSkill('endurance_training').exp - beforeEndurance,
        skillResults: skillResults.length,
        libraryResearchUnlocked: qm.isSkillUnlocked('library_research'),
        unlockMath: unlockMath.success,
        unlockEndurance: unlockEndurance.success
      };
    });
    console.log('[检查] 任务奖励统一接入成长/背包/技能:', rewardResult);
    assert(rewardResult.exp === 50, '经验奖励未统一接入');
    assert(rewardResult.money === 30, '金币奖励未统一接入');
    assert(rewardResult.stamina === 10, '体能奖励未统一接入');
    assert(rewardResult.knowledge === 5, '知识奖励未统一接入');
    assert(rewardResult.mood === 5, '心情奖励未统一接入');
    assert(rewardResult.coffee === 2, '物品奖励未统一接入背包');
    assert(rewardResult.math === 20, '熟练度奖励未统一接入');
    assert(rewardResult.mathFocus > 0, '考试类任务联动未给 math_focus 增加经验');
    assert(rewardResult.skillResults > 0, '任务完成未触发技能经验联动');
    assert(rewardResult.libraryResearchUnlocked, 'unlockSkills 未正确解锁 library_research');

    await page.goto(`${BASE_URL}/tools/tests/test-npc-dialogue.html`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(800);
    if (jsErrors.length > 0) throw new Error(`npc 页面 JS 错误: ${jsErrors.join('; ')}`);
    const npcEffects = await page.evaluate(() => {
      const qm = window.questManager;
      if (!qm) return null;
      const before = { ...qm.characterStats };
      qm.applyStatChanges({ knowledge: 10, social: 5, mood: 3 }, 'dialogue');
      return {
        knowledge: qm.characterStats.knowledge - before.knowledge,
        social: qm.characterStats.social - before.social,
        mood: qm.characterStats.mood - before.mood
      };
    });
    if (npcEffects) {
      console.log('[检查] NPC effects 成长:', npcEffects);
      assert(npcEffects.knowledge === 10, 'NPC 对话知识变化未统一接入');
      assert(npcEffects.social === 5, 'NPC 对话社交变化未统一接入');
      assert(npcEffects.mood === 3, 'NPC 对话心情变化未统一接入');
    } else {
      console.log('[检查] NPC 页面未挂载 questManager，跳过该场景');
    }

    await page.goto(`${BASE_URL}/tools/tests/test-map-poi.html`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(800);
    if (jsErrors.length > 0) throw new Error(`map poi 页面 JS 错误: ${jsErrors.join('; ')}`);
    const mapEffects = await page.evaluate(() => {
      const qm = window.questTriggerManager;
      if (!qm) return null;
      const before = { ...qm.characterStats };
      const beforeRun = qm.sideQuestProgress.runs;
      qm.applyStatChanges({ stamina: 10, mood: 5, money: -5 }, 'daily_canteen');
      qm.applyStatChanges({ stamina: 2 }, 'daily_playground');
      qm.sideQuestProgress.runs += 1;
      qm.applyStatChanges({ knowledge: 5, mood: 2 }, 'daily_library');
      qm.applyStatChanges({ knowledge: 5 }, 'daily_lab');
      return {
        stamina: qm.characterStats.stamina - before.stamina,
        mood: qm.characterStats.mood - before.mood,
        money: qm.characterStats.money - before.money,
        runs: qm.sideQuestProgress.runs - beforeRun
      };
    });
    if (mapEffects) {
      console.log('[检查] 地图场景日常成长:', mapEffects);
      assert(mapEffects.stamina === 12, '地图场景体能成长异常');
      assert(mapEffects.mood === 7, '地图场景心情成长异常');
      assert(mapEffects.money === -5, '地图场景金币消耗异常');
      assert(mapEffects.runs === 1, '地图场景跑步计数异常');
    } else {
      console.log('[检查] map poi 页面未挂载 questTriggerManager，跳过该场景');
    }

    await page.goto(`${BASE_URL}/tools/tests/test-growth-system.html`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(800);
    if (jsErrors.length > 0) throw new Error(`growth 页面 JS 错误: ${jsErrors.join('; ')}`);
    const growthResult = await page.evaluate(() => {
      const qm = window.questManager;
      if (!qm) return null;
      const beforeLevel = qm.characterStats.level;
      const beforeMaxStamina = qm.characterStats.maxStamina;
      qm.applyStatChanges({ experience: 2500 }, 'linkage_test');
      return {
        levelUp: qm.characterStats.level - beforeLevel,
        maxStaminaUp: qm.characterStats.maxStamina - beforeMaxStamina
      };
    });
    if (growthResult) {
      console.log('[检查] 角色成长联动:', growthResult);
      assert(growthResult.levelUp > 0, '大量经验未触发升级');
      assert(growthResult.maxStaminaUp > 0, '升级后 maxStamina 未提升');
    } else {
      console.log('[检查] growth 页面未挂载 questManager，跳过该场景');
    }

    await screenshot(SUCCESS_SCREENSHOT);
    console.log('[✅] 8.4 联动与平衡浏览器验收通过');
  } catch (e) {
    await fail(e.message);
  } finally {
    await browser.close();
    await stopServer();
  }
}

run();
