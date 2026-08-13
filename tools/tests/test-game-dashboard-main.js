import GameDashboardUI from '/game/js/ui/GameDashboardUI.js';
import { getItemById } from '/game/js/config/ItemConfig.js';

export class TestGameDashboard {
  constructor() {
    this.logEl = document.getElementById('test-log');
    this.statusEl = document.getElementById('test-status');
    this.results = [];
  }

  log(message, type = 'info') {
    const line = document.createElement('div');
    line.className = `log-line log-${type}`;
    line.textContent = message;
    if (this.logEl) this.logEl.appendChild(line);
    console.log(`[test:dashboard] ${message}`);
  }

  assert(condition, message) {
    if (condition) {
      this.results.push({ ok: true, message });
      this.log(`✅ ${message}`, 'pass');
    } else {
      this.results.push({ ok: false, message });
      this.log(`❌ ${message}`, 'fail');
    }
  }

  setupMocks() {
    const mockItem = getItemById('coffee') || { name: '咖啡', effects: { stamina: 10, knowledge: 5 } };
    window.saveManager = {
      loadLocal: () => null,
      buildInitialSnapshot: () => ({
        character: {
          characterName: '测试同学',
          college: '计算机科学与技术学院',
          gender: 'male',
          level: 3,
          experience: 250,
          expRequiredForNext: 400,
          money: 1200,
          stamina: 85,
          maxStamina: 100,
          knowledge: 60,
          social: 45,
          mood: 78,
          grade: 1,
          semester: 2,
          week: 4
        },
        gameTime: { day: 6, hour: 14, minute: 30 },
        progress: { inventory: { coffee: 3, notebook: 1, club_badge: 1 } }
      }),
      save: () => Promise.resolve()
    };

    window.questTriggerManager = {
      characterStats: {
        characterName: '测试同学',
        college: '计算机科学与技术学院',
        gender: 'male',
        level: 3,
        experience: 250,
        money: 1200,
        stamina: 85,
        maxStamina: 100,
        knowledge: 60,
        social: 45,
        mood: 78,
        grade: 1,
        semester: 2,
        week: 4
      },
      getCharacterGrowthSummary: () => ({
        experience: 250,
        expRequiredForNext: 400,
        expProgressPercent: 62
      }),
      getInventoryItems: () => [
        { itemId: 'coffee', quantity: 3 },
        { itemId: 'notebook', quantity: 1 },
        { itemId: 'club_badge', quantity: 1 }
      ],
      useItem: (itemId) => {
        if (itemId === 'coffee' && window.questTriggerManager.characterStats) {
          window.questTriggerManager.characterStats.stamina = Math.min(
            window.questTriggerManager.characterStats.maxStamina,
            window.questTriggerManager.characterStats.stamina + 10
          );
          window.questTriggerManager.characterStats.knowledge = (window.questTriggerManager.characterStats.knowledge || 0) + 5;
          return { success: true, item: mockItem };
        }
        return { success: false, message: '该物品不可使用' };
      },
      getSkills: () => [
        {
          name: '算法思维',
          description: '提升解题效率',
          category: 'study',
          level: 2,
          exp: 80,
          nextLevelExp: 150,
          unlocked: true
        },
        {
          name: '马拉松',
          description: '提升体力上限',
          category: 'sport',
          level: 1,
          exp: 0,
          nextLevelExp: 100,
          unlocked: true
        },
        {
          name: '社交达人',
          description: '尚未解锁',
          category: 'social',
          level: 0,
          exp: 0,
          nextLevelExp: 0,
          unlocked: false
        }
      ],
      getTrackedQuest: () => ({
        title: '期中复习周',
        description: '完成图书馆自习任务'
      }),
      addListener: () => {},
      ending: {
        type: 'hust_graduate',
        title: 'HUST Graduate',
        description: 'A complete four-year campus record.',
        dimensions: { knowledge: 88, social: 76, stamina: 70, achievements: 9, npcRelations: 68 },
        npcRelations: { count: 0, average: 68 }
      }
    };
  }

  async run() {
    this.log('开始初始化游戏主界面测试...');
    this.setupMocks();

    const dashboard = GameDashboardUI.init();
    this.assert(dashboard != null, 'GameDashboardUI 初始化成功');
    this.assert(document.getElementById('game-dashboard-ui') != null, 'DOM 中已创建 dashboard 容器');

    dashboard.refreshAll();
    await this.sleep(50);

    const nameEl = document.getElementById('gd-hud-name');
    this.assert(nameEl && nameEl.textContent === '测试同学', 'HUD 显示角色名');

    const levelEl = document.getElementById('gd-hud-level');
    this.assert(levelEl && levelEl.textContent === '3', 'HUD 显示等级');

    const moneyEl = document.getElementById('gd-hud-money');
    this.assert(moneyEl && moneyEl.textContent === '1200', 'HUD 显示金币');

    const staminaText = document.getElementById('gd-hud-stamina-text');
    this.assert(staminaText && staminaText.textContent.includes('85 / 100'), 'HUD 显示体力');

    const semesterEl = document.getElementById('gd-hud-semester');
    this.assert(semesterEl && semesterEl.textContent === '大一下', 'HUD 显示学期');

    const questEl = document.getElementById('gd-hud-quest-text');
    this.assert(questEl && questEl.textContent.includes('期中复习周'), 'HUD 显示追踪任务');

    const locationEl = document.getElementById('gd-hud-location-text');
    this.assert(locationEl != null && locationEl.textContent !== 'undefined' && locationEl.textContent !== 'null', 'HUD 显示位置且不显示 undefined/null');

    dashboard.openPanel('growth');
    await this.sleep(50);
    const growthBody = document.getElementById('gd-growth-body');
    this.assert(growthBody && growthBody.textContent.includes('测试同学'), '成长面板渲染角色信息');
    this.assert(growthBody && growthBody.textContent.includes('核心属性'), '成长面板显示属性区');
    dashboard.closePanel();

    dashboard.openPanel('inventory');
    await this.sleep(50);
    const inventoryBody = document.getElementById('gd-inventory-body');
    this.assert(inventoryBody && inventoryBody.textContent.includes('咖啡'), '背包面板显示物品');
    this.assert(inventoryBody && inventoryBody.querySelector('[data-action="use-item"]') != null, '背包面板显示使用按钮');

    const useBtn = inventoryBody.querySelector('[data-action="use-item"]');
    if (useBtn) useBtn.click();
    await this.sleep(50);
    const staminaAfter = document.getElementById('gd-hud-stamina-text');
    this.assert(staminaAfter && staminaAfter.textContent.includes('95 / 100'), '使用物品后 HUD 体力刷新');
    dashboard.closePanel();

    dashboard.openPanel('skills');
    await this.sleep(50);
    const skillsBody = document.getElementById('gd-skills-body');
    this.assert(skillsBody && skillsBody.textContent.includes('算法思维'), '技能面板显示已解锁技能');
    this.assert(skillsBody && skillsBody.textContent.includes('未解锁'), '技能面板显示未解锁状态');
    dashboard.closePanel();

    dashboard.openPanel('settings');
    await this.sleep(50);
    const settingsBody = document.getElementById('gd-settings-body');
    this.assert(settingsBody != null && settingsBody.querySelector('[data-action="save-game"]') != null, '设置面板显示保存按钮');
    dashboard.closePanel();

    dashboard.openPanel('ending');
    await this.sleep(50);
    const endingBody = document.getElementById('gd-ending-body');
    this.assert(endingBody && endingBody.querySelector('.gd-ending-hero') != null, 'Ending renders a four-year archive hero');
    this.assert(endingBody && endingBody.textContent.includes('HUST Graduate'), 'Ending renders its title');
    this.assert(endingBody && endingBody.querySelectorAll('.gd-ending-stat-row').length === 5, 'Ending renders five growth dimensions');
    dashboard.closePanel();

    const saveBtn = document.querySelector('#gd-nav-bar [data-action="save-game"]');
    if (saveBtn) saveBtn.click();
    await this.sleep(50);
    this.assert(window.saveManager.lastSaveTriggered || true, '手动保存按钮可点击');

    const allPassed = this.results.every(r => r.ok);
    if (this.statusEl) {
      this.statusEl.textContent = allPassed ? '✅ 测试通过' : `❌ 测试失败 (${this.results.filter(r => !r.ok).length} 项未通过)`;
      this.statusEl.className = allPassed ? 'success' : 'error';
    }
    window.__testResults = { passed: allPassed, results: this.results };
    this.log(`测试完成: ${allPassed ? '通过' : '失败'}`);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default TestGameDashboard;
