import { getItemById, isItemUsable, ITEM_TYPE } from '../config/ItemConfig.js';
import { getSkillById } from '../config/SkillConfig.js';
import { ACHIEVEMENT_LIST, getAchievementById } from '../config/AchievementConfig.js';
import { NPC_LIST, getNpcById } from '../config/NpcConfig.js';

/**
 * 国际化最小化标签字典。
 * 可访问性 5.2c：提供中英 HUD 主界面标签切换能力。
 */
const I18N = {
  zh: {
    bag: '背包', quest: '任务', achievement: '成就', map: '地图',
    help: '帮助', menu: '菜单', save: '保存', end: '结束', relation: '关系', ending: '结局',
    growth: '成长', skills: '技能', settings: '设置', close: '关闭',
    hudCore: '核心属性', hudStamina: '体力', hudTime: '学期 / 时间',
    hudQuest: '追踪任务', hudLocation: '当前位置', hudCharacter: '角色',
    saveStatusSaving: '正在保存...', saveStatusSaved: '已保存', saveStatusFailed: '保存失败',
    helpTitle: '键盘快捷键', helpIntro: '以下快捷键可在校园地图与主界面中使用：'
  },
  en: {
    bag: 'Bag', quest: 'Quest', achievement: 'Achievements', map: 'Map',
    help: 'Help', menu: 'Menu', save: 'Save', end: 'End', relation: 'Relations', ending: 'Ending',
    growth: 'Growth', skills: 'Skills', settings: 'Settings', close: 'Close',
    hudCore: 'Core Stats', hudStamina: 'Stamina', hudTime: 'Semester / Time',
    hudQuest: 'Tracked Quest', hudLocation: 'Location', hudCharacter: 'Character',
    saveStatusSaving: 'Saving...', saveStatusSaved: 'Saved', saveStatusFailed: 'Save failed',
    helpTitle: 'Keyboard Shortcuts', helpIntro: 'Use the following shortcuts on campus and in the HUD:'
  }
};

const GameDashboardUI = (() => {
  let instance = null;

  class Dashboard {
    constructor() {
      this.container = null;
      this.overlay = null;
      this.currentPanel = null;
      this.refreshTimer = null;
      this.initialized = false;
      this.lastSaveAt = null;
      this.saveStatusEl = null;
      this.panelOrder = ['growth', 'inventory', 'skills', 'achievements', 'quest', 'settings', 'help'];
      this.inventoryFilter = 'all';
      this.skillFilter = 'all';
      this.data = this._buildEmptyData();
      this.lang = 'zh';
      this._reducedMotion = false;
    }

    _buildEmptyData() {
      return {
        character: {
          characterName: '游客',
          college: '未知学院',
          gender: 'unknown',
          level: 1,
          experience: 0,
          nextExp: 100,
          expPct: 0,
          money: 1000,
          stamina: 50,
          maxStamina: 100,
          knowledge: 50,
          social: 50,
          mood: 50,
          grade: 1,
          semester: 1,
          week: 1
        },
        location: '校园中',
        gameTime: { day: 1, hour: 8, minute: 0 },
        questSummary: { title: '暂无追踪任务', desc: '打开任务日志选择要追踪的任务' }
      };
    }

    init() {
      if (this.initialized) return this;
      this._detectReducedMotion();
      this._bindReducedMotionListener();
      this._createContainer();
      this._bindGlobalEvents();
      this._startAutoRefresh();
      this.refreshAll();
      this.initialized = true;
      return this;
    }

    /**
     * 可访问性 5.2b：检测系统是否开启减少动画偏好。
     */
    _detectReducedMotion() {
      if (typeof window === 'undefined' || !window.matchMedia) return;
      this._reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    _bindReducedMotionListener() {
      if (typeof window === 'undefined' || !window.matchMedia) return;
      const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mql.addEventListener) {
        mql.addEventListener('change', () => { this._reducedMotion = mql.matches; });
      } else if (mql.addListener) {
        mql.addListener(() => { this._reducedMotion = mql.matches; });
      }
    }

    /**
     * 可访问性 5.2c：切换 HUD 主界面语言标签。
     * @param {string} lang - 'zh' | 'en'
     */
    setLanguage(lang) {
      if (!I18N[lang]) return;
      this.lang = lang;
      this._normalizeVisibleLabels();
      this._renderHelpPanel();
      if (this.currentPanel) this._renderPanel(this.currentPanel);
      this.refreshAll();
    }

    /**
     * 国际化最小化翻译函数。
     * @param {string} key - I18N 字典键名
     * @returns {string} 当前语言或中文回退文本
     */
    _t(key) {
      return (I18N[this.lang] && I18N[this.lang][key]) || (I18N.zh[key]) || key;
    }

    _createContainer() {
      if (this.container) return;
      const existing = document.getElementById('game-dashboard-ui');
      if (existing) existing.remove();

      this.container = document.createElement('div');
      this.container.id = 'game-dashboard-ui';
      this.container.innerHTML = `
        <div class="gd-hud gd-pointer-events">
          <div class="gd-hud-left">
            <div class="gd-hud-card" id="gd-hud-character">
              <div class="gd-hud-card-header">
                <div class="gd-hud-avatar" id="gd-hud-avatar">🎓</div>
                <div>
                  <div id="gd-hud-name" style="font-size:14px;font-weight:700;color:var(--hw-text);">游客</div>
                  <div id="gd-hud-college" style="font-size:11px;color:var(--hw-text-muted);">未知学院</div>
                </div>
              </div>
              <div class="gd-hud-card-body">
                <div class="gd-hud-progress-row">
                  <span>Lv.<span id="gd-hud-level">1</span></span>
                  <span id="gd-hud-exp-text">0 / 100</span>
                </div>
                <div class="hw-progress gd-hud-progress">
                  <div class="hw-progress-bar hw-gold" id="gd-hud-exp-bar" style="width:0%;"></div>
                </div>
              </div>
            </div>
            <div class="gd-hud-card" id="gd-hud-stats">
              <div class="gd-hud-card-header">核心属性</div>
              <div class="gd-hud-card-body">
                <div class="gd-hud-row">
                  <span>💰 金币</span>
                  <span class="gd-hud-value" id="gd-hud-money">1000</span>
                </div>
                <div class="gd-hud-row">
                  <span>📚 知识</span>
                  <span class="gd-hud-value" id="gd-hud-knowledge">50</span>
                </div>
                <div class="gd-hud-row">
                  <span>🤝 社交</span>
                  <span class="gd-hud-value" id="gd-hud-social">50</span>
                </div>
                <div class="gd-hud-row">
                  <span>😊 心情</span>
                  <span class="gd-hud-value" id="gd-hud-mood">50</span>
                </div>
              </div>
            </div>
          </div>
          <div class="gd-hud-right">
            <div class="gd-hud-card" id="gd-hud-stamina">
              <div class="gd-hud-card-header">⚡ 体力</div>
              <div class="gd-hud-card-body">
                <div class="gd-hud-progress-row">
                  <span id="gd-hud-stamina-text">50 / 100</span>
                </div>
                <div class="hw-progress gd-hud-progress">
                  <div class="hw-progress-bar" id="gd-hud-stamina-bar" style="width:50%;"></div>
                </div>
              </div>
            </div>
            <div class="gd-hud-card" id="gd-hud-time">
              <div class="gd-hud-card-header">📅 学期 / 时间</div>
              <div class="gd-hud-card-body">
                <div class="gd-hud-row">
                  <span>学期</span>
                  <span class="gd-hud-value" id="gd-hud-semester">大一上</span>
                </div>
                <div class="gd-hud-row">
                  <span>周次</span>
                  <span class="gd-hud-value" id="gd-hud-week">第 1 周</span>
                </div>
                <div class="gd-hud-row">
                  <span>时间</span>
                  <span class="gd-hud-value" id="gd-hud-clock">08:00</span>
                </div>
              </div>
            </div>
            <div class="gd-hud-card" id="gd-hud-quest">
              <div class="gd-hud-card-header">📜 追踪任务</div>
              <div class="gd-hud-card-body">
                <div class="gd-quest-summary" id="gd-hud-quest-text">暂无追踪任务</div>
              </div>
            </div>
            <div class="gd-hud-card" id="gd-hud-location">
              <div class="gd-hud-card-header">📍 当前位置</div>
              <div class="gd-hud-card-body">
                <span class="gd-location-chip" id="gd-hud-location-text">校园中</span>
              </div>
            </div>
          </div>
        </div>

        <div class="gd-save-status" id="gd-save-status">
          <span class="gd-save-status-dot"></span>
          <span id="gd-save-status-text">正在保存...</span>
        </div>

        <nav class="gd-nav-bar gd-pointer-events" id="gd-nav-bar">
          <button class="gd-nav-btn" data-action="toggle-map" title="校园地图">
            <span class="gd-nav-icon">🗺️</span><span>地图</span>
          </button>
          <button class="gd-nav-btn" data-action="open-achievements" title="成就">
            <span class="gd-nav-icon">🏆</span><span>成就</span>
          </button>
          <button class="gd-nav-btn gd-nav-btn-ending gd-nav-btn-ending-hidden" data-action="open-ending" title="毕业结局">
            <span class="gd-nav-icon">🎓</span><span>结局</span>
          </button>
          <button class="gd-nav-btn" data-action="open-quest" title="任务日志">
            <span class="gd-nav-icon">📜</span><span>任务</span>
          </button>
          <button class="gd-nav-btn" data-action="open-inventory" title="背包">
            <span class="gd-nav-icon">🎒</span><span>背包</span>
          </button>
          <button class="gd-nav-btn" data-action="open-growth" title="角色成长">
            <span class="gd-nav-icon">📈</span><span>成长</span>
          </button>
          <button class="gd-nav-btn" data-action="open-skills" title="技能">
            <span class="gd-nav-icon">✨</span><span>技能</span>
          </button>
          <button class="gd-nav-btn gd-nav-btn-primary" data-action="save-game" title="保存进度">
            <span class="gd-nav-icon">💾</span><span>保存</span>
          </button>
          <button class="gd-nav-btn" data-action="open-help" title="键盘快捷键">
            <span class="gd-nav-icon">❓</span><span>帮助</span>
          </button>
          <button class="gd-nav-btn" data-action="open-settings" title="返回首页 / 设置">
            <span class="gd-nav-icon">⚙️</span><span>首页</span>
          </button>
          <button class="gd-nav-btn" data-action="toggle-lang" title="切换语言">
            <span class="gd-nav-icon">🌐</span><span id="gd-lang-label">中/EN</span>
          </button>
        </nav>

        <div class="gd-overlay" id="gd-overlay"></div>

        <div class="gd-panel hw-panel gd-pointer-events" id="gd-panel-growth" data-panel="growth">
          <div class="gd-panel-header">
            <h3 class="gd-panel-title">📈 角色成长</h3>
            <button class="hw-button hw-button-ghost hw-icon-button gd-close-panel" data-action="close-panel">✕</button>
          </div>
          <div class="gd-panel-body" id="gd-growth-body"></div>
          <div class="gd-panel-footer">
            <button class="hw-button hw-button-secondary gd-close-panel" data-action="close-panel">关闭</button>
          </div>
        </div>

        <div class="gd-panel hw-panel gd-pointer-events" id="gd-panel-inventory" data-panel="inventory">
          <div class="gd-panel-header">
            <h3 class="gd-panel-title">🎒 背包</h3>
            <button class="hw-button hw-button-ghost hw-icon-button gd-close-panel" data-action="close-panel">✕</button>
          </div>
          <div class="gd-panel-body" id="gd-inventory-body"></div>
          <div class="gd-panel-footer">
            <button class="hw-button hw-button-secondary gd-close-panel" data-action="close-panel">关闭</button>
          </div>
        </div>

        <div class="gd-panel hw-panel gd-pointer-events" id="gd-panel-skills" data-panel="skills">
          <div class="gd-panel-header">
            <h3 class="gd-panel-title">✨ 技能</h3>
            <button class="hw-button hw-button-ghost hw-icon-button gd-close-panel" data-action="close-panel">✕</button>
          </div>
          <div class="gd-panel-body" id="gd-skills-body"></div>
          <div class="gd-panel-footer">
            <button class="hw-button hw-button-secondary gd-close-panel" data-action="close-panel">关闭</button>
          </div>
        </div>

        <div class="gd-panel hw-panel gd-pointer-events" id="gd-panel-achievements" data-panel="achievements">
          <div class="gd-panel-header">
            <h3 class="gd-panel-title">🏆 成就</h3>
            <button class="hw-button hw-button-ghost hw-icon-button gd-close-panel" data-action="close-panel">✕</button>
          </div>
          <div class="gd-panel-body" id="gd-achievements-body"></div>
          <div class="gd-panel-footer">
            <button class="hw-button hw-button-secondary gd-close-panel" data-action="close-panel">关闭</button>
          </div>
        </div>

        <div class="gd-panel hw-panel gd-pointer-events" id="gd-panel-ending" data-panel="ending">
          <div class="gd-panel-header">
            <h3 class="gd-panel-title">🎓 毕业结局</h3>
            <button class="hw-button hw-button-ghost hw-icon-button gd-close-panel" data-action="close-panel">✕</button>
          </div>
          <div class="gd-panel-body" id="gd-ending-body"></div>
          <div class="gd-panel-footer">
            <button class="hw-button hw-button-secondary gd-close-panel" data-action="close-panel">关闭</button>
          </div>
        </div>

        <div class="gd-panel hw-panel gd-pointer-events" id="gd-panel-settings" data-panel="settings">
          <div class="gd-panel-header">
            <h3 class="gd-panel-title">⚙️ 设置</h3>
            <button class="hw-button hw-button-ghost hw-icon-button gd-close-panel" data-action="close-panel">✕</button>
          </div>
          <div class="gd-panel-body" id="gd-settings-body">
            <div class="hw-text-muted" style="margin-bottom:16px;">你可以在这里返回首页或手动保存。</div>
            <div style="display:flex;flex-direction:column;gap:12px;">
              <button class="hw-button hw-button-primary" id="gd-btn-save-settings" data-action="save-game">💾 保存进度</button>
              <button class="hw-button hw-button-secondary" id="gd-btn-return-home" data-action="return-home">🏠 返回首页</button>
            </div>
          </div>
          <div class="gd-panel-footer">
            <button class="hw-button hw-button-secondary gd-close-panel" data-action="close-panel">关闭</button>
          </div>
        </div>

        <div class="gd-panel hw-panel gd-pointer-events gd-help-panel" id="gd-panel-help" data-panel="help" role="dialog" aria-modal="true" aria-labelledby="gd-help-title">
          <div class="gd-panel-header">
            <h3 class="gd-panel-title" id="gd-help-title">❓ 键盘快捷键</h3>
            <button class="hw-button hw-button-ghost hw-icon-button gd-close-panel" data-action="close-panel">✕</button>
          </div>
          <div class="gd-panel-body" id="gd-help-body"></div>
          <div class="gd-panel-footer">
            <button class="hw-button hw-button-secondary gd-close-panel" data-action="close-panel">关闭</button>
          </div>
        </div>
      `;
      document.body.appendChild(this.container);
      this._normalizeVisibleLabels();

      this.overlay = this.container.querySelector('#gd-overlay');
      this.saveStatusEl = this.container.querySelector('#gd-save-status');
      this._bindPanelEvents();
      this._renderHelpPanel();
    }

    _normalizeVisibleLabels() {
      const setText = (selector, text) => {
        const el = this.container.querySelector(selector);
        if (el) el.textContent = text;
      };
      const setTitle = (selector, text) => {
        const el = this.container.querySelector(selector);
        if (el) el.setAttribute('title', text);
      };

      setText('#gd-hud-avatar', 'HW');
      setText('#gd-hud-name', '游客');
      setText('#gd-hud-college', '未选择学院');
      setText('#gd-hud-stats .gd-hud-card-header', this._t('hudCore'));
      setText('#gd-hud-stamina .gd-hud-card-header', this._t('hudStamina'));
      setText('#gd-hud-time .gd-hud-card-header', this._t('hudTime'));
      setText('#gd-hud-quest .gd-hud-card-header', this._t('hudQuest'));
      setText('#gd-hud-location .gd-hud-card-header', this._t('hudLocation'));
      setText('#gd-save-status-text', this._t('saveStatusSaving'));
      setText('#gd-lang-label', this.lang === 'zh' ? '中/EN' : 'EN/中');

      const statLabels = this.container.querySelectorAll('#gd-hud-stats .gd-hud-row > span:first-child');
      ['金币', '知识', '社交', '心情'].forEach((label, index) => {
        if (statLabels[index]) statLabels[index].textContent = label;
      });

      const navLabels = [
        ['toggle-map', this._t('map'), '校园地图'],
        ['open-achievements', this._t('achievement'), '成就'],
        ['open-quest', this._t('quest'), '任务日志'],
        ['open-inventory', this._t('bag'), '背包'],
        ['open-growth', this._t('growth'), '角色成长'],
        ['open-skills', this._t('skills'), '技能'],
        ['save-game', this._t('save'), '保存进度'],
        ['open-help', this._t('help'), '键盘快捷键'],
        ['open-settings', this._t('menu'), '返回首页 / 设置'],
        ['open-ending', this._t('ending'), '毕业结局'],
        ['toggle-lang', '中/EN', '切换语言']
      ];
      navLabels.forEach(([action, label, title]) => {
        const button = this.container.querySelector(`.gd-nav-btn[data-action="${action}"]`);
        if (!button) return;
        const icon = button.querySelector('.gd-nav-icon');
        const text = button.querySelector('span:last-child');
        if (icon) icon.textContent = '';
        if (text) text.textContent = label;
        button.setAttribute('title', title);
      });

      setText('#gd-panel-growth .gd-panel-title', this._t('growth'));
      setText('#gd-panel-inventory .gd-panel-title', this._t('bag'));
      setText('#gd-panel-skills .gd-panel-title', this._t('skills'));
      setText('#gd-panel-achievements .gd-panel-title', this._t('achievement'));
      setText('#gd-panel-ending .gd-panel-title', this._t('ending'));
      setText('#gd-panel-settings .gd-panel-title', this._t('settings'));
      setText('#gd-help-title', '❓ ' + this._t('helpTitle'));
      setText('#gd-btn-save-settings', this._t('save'));
      setText('#gd-btn-return-home', '返回首页');
      setTitle('#gd-btn-save-settings', '保存进度');
      setTitle('#gd-btn-return-home', '返回首页');
    }

    _bindPanelEvents() {
      this.container.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        if (action === 'close-panel') this.closePanel();
        else if (action === 'open-growth') this.openPanel('growth');
        else if (action === 'open-inventory') this.openPanel('inventory');
        else if (action === 'open-skills') this.openPanel('skills');
        else if (action === 'open-achievements') this.openPanel('achievements');
        else if (action === 'open-ending') this.openPanel('ending');
        else if (action === 'open-quest') this.openQuestLog();
        else if (action === 'open-settings') this.openPanel('settings');
        else if (action === 'open-help') this.openPanel('help');
        else if (action === 'save-game') this.manualSave();
        else if (action === 'return-home') this.returnHome();
        else if (action === 'toggle-map') this.toggleMap();
        else if (action === 'toggle-lang') this.setLanguage(this.lang === 'zh' ? 'en' : 'zh');
        else if (action === 'use-item') {
          const itemId = btn.dataset.itemId;
          if (itemId) this.useItem(itemId);
        } else if (action === 'filter-inventory') {
          this.inventoryFilter = btn.dataset.filter || 'all';
          this._renderInventoryPanel();
        } else if (action === 'filter-skills') {
          this.skillFilter = btn.dataset.filter || 'all';
          this._renderSkillsPanel();
        }
      });

      this.overlay.addEventListener('click', () => this.closePanel());

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.currentPanel) this.closePanel();
        if (e.key === 'h' || e.key === 'H') this.openPanel('help');
      });
    }

    _bindGlobalEvents() {
      const qm = this._getQuestManager();
      if (qm && qm.addListener) {
        qm.addListener('character:updated', () => this.refreshAll());
        qm.addListener('inventory:changed', () => this.refreshAll());
        qm.addListener('skill:expChanged', () => this.refreshAll());
        qm.addListener('skill:levelUp', () => this.refreshAll());
        qm.addListener('quest:activated', () => this.refreshAll());
        qm.addListener('quest:completed', () => { this.refreshAll(); this._refreshEndingButton(); });
        qm.addListener('quest:ending', () => { this.refreshAll(); this._refreshEndingButton(); });
        qm.addListener('sideQuest:completed', () => this.refreshAll());
      }
      window.addEventListener('beforeunload', () => this._autoSaveBeforeUnload());
    }

    _getSaveManager() {
      return typeof window !== 'undefined' && window.saveManager ? window.saveManager : null;
    }

    _getQuestManager() {
      return typeof window !== 'undefined' && window.questTriggerManager ? window.questTriggerManager : null;
    }

    _getTimeSystem() {
      return typeof window !== 'undefined' && window.timeSystem ? window.timeSystem : null;
    }

    _getInventoryManager() {
      return typeof window !== 'undefined' && window.inventoryManager ? window.inventoryManager : this._getQuestManager();
    }

    _formatValue(value) {
      if (value === undefined || value === null || Number.isNaN(value)) return '—';
      return value;
    }

    _formatSemester(grade, semester) {
      const gradeMap = { 1: '大一', 2: '大二', 3: '大三', 4: '大四' };
      const semMap = { 1: '上', 2: '下' };
      return `${gradeMap[grade] || '大一'}${semMap[semester] || '上'}`;
    }

    _getCurrentLocation() {
      let location = '校园中';
      if (typeof window !== 'undefined') {
        if (window.currentSceneId && window.currentSceneId !== 'campus') {
          location = window.sceneName || window.currentSceneId || '室内场景';
        } else if (window._mapData && window._character) {
          try {
            const nearby = window._mapData.findLocationAt(window._character.x, window._character.y, 80);
            if (nearby && nearby.name) location = nearby.name;
          } catch (e) {}
        } else if (window._character) {
          const x = Math.round(window._character.x || 0);
          const y = Math.round(window._character.y || 0);
          location = `校园 (${x}, ${y})`;
        }
      }
      return location;
    }

    _captureData() {
      const data = this._buildEmptyData();
      const qm = this._getQuestManager();
      const sm = this._getSaveManager();
      const ts = this._getTimeSystem();

      let source = qm ? qm.characterStats : null;
      if (!source && sm) {
        try {
          const snap = sm.loadLocal ? sm.loadLocal() : sm.buildInitialSnapshot();
          source = snap && snap.character ? snap.character : null;
        } catch (e) {
          source = null;
        }
      }
      if (source) {
        data.character.level = Number(source.level) || 1;
        data.character.experience = Number(source.experience) || 0;
        data.character.money = Number(source.money) || 0;
        data.character.stamina = Number(source.stamina) || 0;
        data.character.maxStamina = Number(source.maxStamina) || 100;
        data.character.knowledge = Number(source.knowledge) || 0;
        data.character.social = Number(source.social) || 0;
        data.character.mood = Number(source.mood) || 0;
        data.character.grade = Number(source.grade) || 1;
        data.character.semester = Number(source.semester) || 1;
        data.character.week = Number(source.week) || 1;
      }

      if (qm && qm.getCharacterGrowthSummary) {
        try {
          const summary = qm.getCharacterGrowthSummary();
          data.character.nextExp = summary.expRequiredForNext;
          data.character.expPct = summary.expProgressPercent;
        } catch (e) {
          data.character.nextExp = Math.floor(100 * Math.pow(1.5, data.character.level - 2)) || 100;
          data.character.expPct = data.character.nextExp > 0
            ? Math.min(100, Math.floor((data.character.experience / data.character.nextExp) * 100))
            : 0;
        }
      } else {
        data.character.nextExp = Math.floor(100 * Math.pow(1.5, data.character.level - 2)) || 100;
        data.character.expPct = data.character.nextExp > 0
          ? Math.min(100, Math.floor((data.character.experience / data.character.nextExp) * 100))
          : 0;
      }

      if (ts && typeof ts.getTime === 'function') {
        try {
          data.gameTime = ts.getTime();
        } catch (e) {
          data.gameTime = { day: 1, hour: 8, minute: 0 };
        }
      } else if (qm && qm.gameTime) {
        data.gameTime = { ...qm.gameTime };
      }

      data.character.characterName = source && source.characterName ? source.characterName : (this._getCharacterName() || '游客');
      data.character.college = source && source.college ? source.college : '未知学院';
      data.character.gender = source && source.gender ? source.gender : 'unknown';
      data.location = this._getCurrentLocation();
      data.questSummary = this._getQuestSummary();

      return data;
    }

    _getCharacterName() {
      if (typeof window !== 'undefined') {
        if (window.fusionSystem && window.fusionSystem.characterData) {
          return window.fusionSystem.characterData.characterName;
        }
        if (window.sessionManager) {
          const current = window.sessionManager.getCurrentCharacter();
          if (current) return current.characterName;
        }
        if (window._character && window._character.name) return window._character.name;
      }
      return null;
    }

    _getQuestSummary() {
      const qm = this._getQuestManager();
      if (!qm) return { title: '任务系统未就绪', desc: '稍后再试' };
      let tracked = null;
      try {
        tracked = qm.getTrackedQuest ? qm.getTrackedQuest() : null;
      } catch (e) {}
      let activeId = null;
      try {
        activeId = qm.getActiveQuest ? qm.getActiveQuest() : qm.activeQuest;
      } catch (e) {}
      let quest = tracked;
      if (!quest && activeId) {
        try {
          quest = qm.getQuestDetail ? qm.getQuestDetail(activeId) : null;
        } catch (e) {}
      }
      if (quest && quest.title) {
        return { title: quest.title, desc: quest.description || '按 J 打开任务日志查看详情' };
      }
      if (qm.getCurrentPhase) {
        try {
          const phase = qm.getCurrentPhase();
          return { title: phase.name || '当前阶段', desc: `进度 ${phase.completedCount || 0} / ${phase.totalCount || 0}` };
        } catch (e) {}
      }
      return { title: '暂无追踪任务', desc: '打开任务日志选择要追踪的任务' };
    }

    refreshAll() {
      this.data = this._captureData();
      this._renderHUD();
      this._refreshEndingButton();
      if (this.currentPanel) this._renderPanel(this.currentPanel);
    }

    _refreshEndingButton() {
      const button = this.container?.querySelector('.gd-nav-btn-ending');
      if (!button) return;
      const visible = this._isEndingAvailable();
      button.classList.toggle('gd-nav-btn-ending-hidden', !visible);
    }

    _isEndingAvailable() {
      const qm = this._getQuestManager();
      if (!qm) return false;
      if (qm.ending && typeof qm.ending === 'object') return true;
      if (Array.isArray(qm.completedQuests) && qm.completedQuests.includes('graduation')) return true;
      if (qm.progress?.ending && typeof qm.progress.ending === 'object') return true;
      return false;
    }

    _renderHUD() {
      const d = this.data.character;
      const set = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = this._formatValue(value);
      };
      set('gd-hud-name', d.characterName);
      set('gd-hud-college', d.college);
      set('gd-hud-level', d.level);
      set('gd-hud-exp-text', `${d.experience} / ${d.nextExp}`);
      set('gd-hud-money', d.money);
      set('gd-hud-knowledge', d.knowledge);
      set('gd-hud-social', d.social);
      set('gd-hud-mood', d.mood);
      set('gd-hud-stamina-text', `${d.stamina} / ${d.maxStamina}`);
      set('gd-hud-semester', this._formatSemester(d.grade, d.semester));
      set('gd-hud-week', `第 ${d.week || 1} 周`);
      set('gd-hud-clock', `${String(d.gameTime?.hour || 8).padStart(2, '0')}:${String(d.gameTime?.minute || 0).padStart(2, '0')}`);
      set('gd-hud-quest-text', `${this.data.questSummary.title}\n${this.data.questSummary.desc}`);
      set('gd-hud-location-text', this.data.location);

      const expBar = document.getElementById('gd-hud-exp-bar');
      if (expBar) expBar.style.width = `${d.expPct}%`;
      const staminaBar = document.getElementById('gd-hud-stamina-bar');
      if (staminaBar) staminaBar.style.width = d.maxStamina > 0 ? `${Math.min(100, (d.stamina / d.maxStamina) * 100)}%` : '0%';
      const avatar = document.getElementById('gd-hud-avatar');
      if (avatar) avatar.textContent = d.gender === 'female' ? '👩‍🎓' : '👨‍🎓';
    }

    _renderPanel(name) {
      if (name === 'growth') this._renderGrowthPanel();
      else if (name === 'inventory') this._renderInventoryPanel();
      else if (name === 'skills') this._renderSkillsPanel();
      else if (name === 'achievements') this._renderAchievementsPanel();
      else if (name === 'ending') this._renderEndingPanel();
      else if (name === 'help') this._renderHelpPanel();
      this._sanitizePanelLabels();
    }

    _sanitizePanelLabels() {
      const roots = [
        document.getElementById('gd-growth-body'),
        document.getElementById('gd-inventory-body'),
        document.getElementById('gd-skills-body'),
        document.getElementById('gd-achievements-body')
      ].filter(Boolean);
      const replacements = [
        [/馃挵\s*/g, ''],
        [/鈿?\s*/g, ''],
        [/馃摎\s*/g, ''],
        [/馃\s*/g, ''],
        [/馃槉\s*/g, ''],
        [/馃椇锔?\s*/g, ''],
        [/馃帓\s*/g, ''],
        [/鉁?\s*/g, ''],
        [/鈻?\s*/g, ''],
        [/鈼?\s*/g, '']
      ];
      roots.forEach((root) => {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach((node) => {
          let text = node.nodeValue;
          replacements.forEach(([pattern, value]) => {
            text = text.replace(pattern, value);
          });
          node.nodeValue = text;
        });
      });
    }

    _renderGrowthPanel() {
      const body = document.getElementById('gd-growth-body');
      if (!body) return;
      const d = this.data.character;
      const qm = this._getQuestManager();
      let summary = null;
      try {
        summary = qm && qm.getCharacterGrowthSummary ? qm.getCharacterGrowthSummary() : null;
      } catch (e) {}
      const expLabel = summary ? `${summary.experience} / ${summary.expRequiredForNext}` : `${d.experience} / ${d.nextExp}`;
      const expPct = summary ? summary.expProgressPercent : d.expPct;
      const staminaPct = d.maxStamina > 0 ? Math.min(100, (d.stamina / d.maxStamina) * 100) : 0;

      body.innerHTML = `
        <div class="gd-section-title">基础信息</div>
        <div class="hw-card" style="margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
            <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--hw-hust-blue-light),var(--hw-vivid-green));display:flex;align-items:center;justify-content:center;font-size:22px;">${d.gender === 'female' ? '👩‍🎓' : '👨‍🎓'}</div>
            <div>
              <div style="font-size:16px;font-weight:700;color:var(--hw-text);">${this._formatValue(d.characterName)}</div>
              <div style="font-size:13px;color:var(--hw-text-muted);">${this._formatValue(d.college)}</div>
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <span class="hw-badge hw-badge-warning">Lv.${d.level}</span>
            <span class="hw-badge hw-badge-info">${this._formatSemester(d.grade, d.semester)}</span>
            <span class="hw-badge hw-badge-success">第 ${d.week || 1} 周</span>
          </div>
        </div>

        <div class="gd-section-title">等级与经验</div>
        <div class="hw-card" style="margin-bottom:16px;">
          <div class="gd-hud-progress-row">
            <span style="font-weight:700;color:var(--hw-gold);">Lv.${d.level}</span>
            <span class="hw-text-muted">${expLabel}</span>
          </div>
          <div class="hw-progress" style="margin-bottom:8px;">
            <div class="hw-progress-bar hw-gold" style="width:${expPct}%;"></div>
          </div>
          <div class="hw-text-muted">升级到下一级需要 ${summary ? summary.expRequiredForNext : d.nextExp} 经验</div>
        </div>

        <div class="gd-section-title">核心属性</div>
        <div class="gd-stat-grid" style="margin-bottom:16px;">
          <div class="gd-stat-card">
            <span class="gd-stat-card-label">💰 金币</span>
            <span class="gd-stat-card-value">${d.money}</span>
          </div>
          <div class="gd-stat-card">
            <span class="gd-stat-card-label">⚡ 体力</span>
            <span class="gd-stat-card-value">${d.stamina} / ${d.maxStamina}</span>
            <div class="hw-progress" style="margin-top:6px;">
              <div class="hw-progress-bar" style="width:${staminaPct}%;"></div>
            </div>
          </div>
          <div class="gd-stat-card">
            <span class="gd-stat-card-label">📚 知识</span>
            <span class="gd-stat-card-value">${d.knowledge}</span>
          </div>
          <div class="gd-stat-card">
            <span class="gd-stat-card-label">🤝 社交</span>
            <span class="gd-stat-card-value">${d.social}</span>
          </div>
          <div class="gd-stat-card">
            <span class="gd-stat-card-label">😊 心情</span>
            <span class="gd-stat-card-value">${d.mood}</span>
          </div>
          <div class="gd-stat-card">
            <span class="gd-stat-card-label">🗺️ 当前位置</span>
            <span class="gd-stat-card-value" style="font-size:13px;">${this.data.location}</span>
          </div>
        </div>

        <div class="gd-section-title">当前追踪</div>
        <div class="hw-card">
          <div style="font-weight:700;color:var(--hw-gold);margin-bottom:6px;">${this.data.questSummary.title}</div>
          <div class="hw-text-muted">${this.data.questSummary.desc}</div>
        </div>
      `;
    }

    _renderInventoryPanel() {
      const body = document.getElementById('gd-inventory-body');
      if (!body) return;
      const inv = this._getInventoryItems();
      if (inv.length === 0) {
        body.innerHTML = `
          <div class="hw-empty-state gd-empty-state">
            <div class="hw-empty-state-icon">🎒</div>
            <div>背包空空如也</div>
            <div class="hw-text-muted">在校园商店购买或在任务中获取物品</div>
          </div>
        `;
        return;
      }
      const entries = inv.map(entry => {
        const item = getItemById(entry.itemId) || { itemId: entry.itemId, name: entry.itemId, description: '', type: 'unknown', category: 'unknown', icon: 'ITEM', effects: {} };
        return { ...entry, item, usable: isItemUsable(item) };
      });
      const visibleEntries = entries.filter(entry => {
        if (this.inventoryFilter === 'usable') return entry.usable;
        if (this.inventoryFilter === 'quest') return entry.item.type === ITEM_TYPE.QUEST || entry.item.category === ITEM_TYPE.QUEST;
        if (this.inventoryFilter === 'collection') return !entry.usable && entry.item.type !== ITEM_TYPE.QUEST && entry.item.category !== ITEM_TYPE.QUEST;
        return true;
      });
      const totalCount = entries.reduce((sum, entry) => sum + entry.quantity, 0);
      body.innerHTML = `
        <div class="gd-panel-intro">
          <div><div class="hw-panel-kicker">Inventory</div><div class="gd-section-title">背包物品</div></div>
          <span class="hw-badge hw-badge-info">${entries.length} 种 · ${totalCount} 件</span>
        </div>
        <div class="hw-segmented gd-panel-filter" aria-label="背包分类">
          ${this._renderFilterButton('filter-inventory', 'all', '全部', this.inventoryFilter)}
          ${this._renderFilterButton('filter-inventory', 'usable', '可使用', this.inventoryFilter)}
          ${this._renderFilterButton('filter-inventory', 'quest', '任务物品', this.inventoryFilter)}
          ${this._renderFilterButton('filter-inventory', 'collection', '收藏/装备', this.inventoryFilter)}
        </div>
        <div id="gd-inventory-list"></div>
      `;
      const list = body.querySelector('#gd-inventory-list');
      if (visibleEntries.length === 0) {
        list.innerHTML = '<div class="hw-empty-state gd-empty-state"><div class="hw-empty-state-icon">□</div><div>该分类暂无物品</div><div class="hw-text-muted">完成任务或前往校园商店获取更多物品</div></div>';
        return;
      }
      for (const entry of visibleEntries) {
        const { item, usable } = entry;
        const effectText = this._formatEffects(item.effects);
        const el = document.createElement('div');
        el.className = `gd-item-card gd-item-${item.rarity || 'common'}`;
        el.innerHTML = `
          <div class="gd-item-info">
            <div class="gd-item-icon">${item.icon || '📦'}</div>
            <div style="min-width:0;">
              <div class="gd-item-name">${item.name}</div>
              <div class="gd-item-description">${item.description || '暂无物品描述'}</div>
              <div class="gd-item-meta">${this._itemTypeLabel(item.type || item.category)} · ${effectText}</div>
            </div>
          </div>
          <div class="gd-item-actions">
            <span class="hw-badge">x${entry.quantity}</span>
            ${usable ? `<button class="hw-button hw-button-primary" data-action="use-item" data-item-id="${entry.itemId}">使用</button>` : '<span class="hw-tag">不可直接使用</span>'}
          </div>
        `;
        list.appendChild(el);
      }
    }

    _renderFilterButton(action, filter, label, current) {
      return `<button type="button" class="${filter === current ? 'is-active' : ''}" data-action="${action}" data-filter="${filter}" aria-pressed="${filter === current}">${label}</button>`;
    }

    _itemTypeLabel(type) {
      const labels = {
        consumable: '消耗品', equipment: '装备', collectible: '收藏品',
        ticket: '通行证', quest: '任务物品', material: '材料', gift: '礼物'
      };
      return labels[type] || '其他物品';
    }

    _getInventoryItems() {
      const qm = this._getQuestManager();
      if (qm && qm.getInventoryItems) {
        try {
          return qm.getInventoryItems();
        } catch (e) {}
      }
      const sm = this._getSaveManager();
      if (sm) {
        try {
          const snap = sm.loadLocal ? sm.loadLocal() : sm.buildInitialSnapshot();
          const inventory = snap && snap.progress && snap.progress.inventory ? snap.progress.inventory : {};
          return Object.entries(inventory).map(([itemId, data]) => {
            const quantity = typeof data === 'number' ? data : (data && typeof data.quantity === 'number' ? data.quantity : 0);
            return { itemId, quantity };
          }).filter(entry => entry.quantity > 0);
        } catch (e) {}
      }
      return [];
    }

    _formatEffects(effects) {
      if (!effects || Object.keys(effects).length === 0) return '无效果';
      const map = { stamina: '体力', knowledge: '知识', social: '社交', mood: '心情', experience: '经验', money: '金币' };
      return Object.entries(effects).map(([k, v]) => `${map[k] || k} ${v > 0 ? '+' : ''}${v}`).join(' · ');
    }

    _renderSkillsPanel() {
      const body = document.getElementById('gd-skills-body');
      if (!body) return;
      const qm = this._getQuestManager();
      let skills = [];
      try {
        skills = qm && qm.getSkills ? qm.getSkills() : [];
      } catch (e) {}
      if (skills.length === 0) {
        body.innerHTML = `
          <div class="hw-empty-state gd-empty-state">
            <div class="hw-empty-state-icon">✨</div>
            <div>技能系统未就绪</div>
            <div class="hw-text-muted">完成任务和日常活动可解锁技能</div>
          </div>
        `;
        return;
      }
      const unlockedCount = skills.filter(skill => skill.unlocked).length;
      const visibleSkills = skills.filter(skill => this.skillFilter === 'all' || skill.category === this.skillFilter);
      body.innerHTML = `
        <div class="gd-panel-intro">
          <div><div class="hw-panel-kicker">Proficiency</div><div class="gd-section-title">技能与熟练度</div></div>
          <span class="hw-badge hw-badge-success">已解锁 ${unlockedCount} / ${skills.length}</span>
        </div>
        <div class="hw-segmented gd-panel-filter" aria-label="技能分类">
          ${this._renderFilterButton('filter-skills', 'all', '全部', this.skillFilter)}
          ${this._renderFilterButton('filter-skills', 'study', '学习', this.skillFilter)}
          ${this._renderFilterButton('filter-skills', 'sport', '体育', this.skillFilter)}
          ${this._renderFilterButton('filter-skills', 'social', '社交', this.skillFilter)}
          ${this._renderFilterButton('filter-skills', 'exploration', '探索', this.skillFilter)}
          ${this._renderFilterButton('filter-skills', 'career', '职业', this.skillFilter)}
        </div>
        <div id="gd-skills-list"></div>
      `;
      const list = body.querySelector('#gd-skills-list');
      if (visibleSkills.length === 0) {
        list.innerHTML = '<div class="hw-empty-state gd-empty-state"><div class="hw-empty-state-icon">◇</div><div>该方向暂无技能</div><div class="hw-text-muted">继续推进校园经历以解锁新的成长方向</div></div>';
        return;
      }
      for (const skill of visibleSkills) {
        const config = getSkillById(skill.id || skill.skillId) || {};
        const nextExp = skill.nextLevelExp || 0;
        const expPct = nextExp > 0 && skill.exp ? Math.min(100, Math.floor((skill.exp / nextExp) * 100)) : 0;
        const effectText = this._skillEffectText(skill.effects || config.effects);
        const unlockText = skill.unlockReason || this._skillUnlockText(config.unlockConditions);
        const el = document.createElement('div');
        el.className = `gd-skill-card ${skill.unlocked ? '' : 'gd-skill-locked'}`;
        el.innerHTML = `
          <div class="gd-skill-header">
            <div><span class="gd-skill-name">${skill.name}</span><span class="gd-skill-category">${this._skillCategoryLabel(skill.category)}</span></div>
            <span class="hw-badge ${skill.unlocked ? 'hw-badge-success' : 'hw-badge'}">${skill.unlocked ? `Lv.${skill.level}` : '未解锁'}</span>
          </div>
          <div class="gd-skill-desc">${skill.description || '暂无描述'}</div>
          <div class="gd-skill-effect">${skill.unlocked ? effectText : `解锁条件：${unlockText}`}</div>
          <div class="gd-hud-progress-row">
            <span class="hw-text-muted">${skill.unlocked ? `熟练度 ${expPct}%` : '完成对应任务后解锁'}</span>
            <span class="hw-text-muted">${skill.unlocked ? `${skill.exp} / ${nextExp || 'MAX'}` : '未解锁'}</span>
          </div>
          <div class="hw-progress" style="margin-top:6px;">
            <div class="hw-progress-bar" style="width:${skill.unlocked ? expPct : 0}%;"></div>
          </div>
        `;
        list.appendChild(el);
      }
    }

    _getUnlockedAchievements() {
      const sm = this._getSaveManager();
      let list = [];
      if (sm) {
        try {
          const snap = sm.loadLocal ? sm.loadLocal() : null;
          const progress = snap && snap.progress ? snap.progress : null;
          if (progress && Array.isArray(progress.achievements)) list = progress.achievements;
        } catch (e) {}
      }
      if (!list.length && typeof window !== 'undefined' && window.questTriggerManager) {
        try {
          const qm = window.questTriggerManager;
          if (Array.isArray(qm.achievements)) list = qm.achievements;
          else if (qm.progress && Array.isArray(qm.progress.achievements)) list = qm.progress.achievements;
        } catch (e) {}
      }
      return Array.isArray(list) ? list : [];
    }

    _getAchievementList() {
      try {
        if (typeof ACHIEVEMENT_LIST !== 'undefined' && Array.isArray(ACHIEVEMENT_LIST)) return ACHIEVEMENT_LIST;
      } catch (e) {}
      return [];
    }

    _renderAchievementsPanel() {
      const body = document.getElementById('gd-achievements-body');
      if (!body) return;
      const achievements = this._getAchievementList();
      const unlockedIds = this._getUnlockedAchievements();
      const unlockedSet = new Set(unlockedIds);
      const unlockedCount = achievements.filter(a => unlockedSet.has(a.id)).length;

      if (achievements.length === 0) {
        body.innerHTML = `
          <div class="hw-empty-state gd-empty-state">
            <div class="hw-empty-state-icon">🏆</div>
            <div>成就系统未就绪</div>
            <div class="hw-text-muted">完成校园任务后解锁成就</div>
          </div>
        `;
        return;
      }

      body.innerHTML = `
        <div class="gd-panel-intro">
          <div><div class="hw-panel-kicker">Achievements</div><div class="gd-section-title">校园成就</div></div>
          <span class="hw-badge hw-badge-success">已解锁 ${unlockedCount} / ${achievements.length}</span>
        </div>
        <div id="gd-achievements-list"></div>
      `;
      const list = body.querySelector('#gd-achievements-list');
      for (const achievement of achievements) {
        const unlocked = unlockedSet.has(achievement.id);
        const el = document.createElement('div');
        el.className = `gd-achievement-card ${unlocked ? '' : 'gd-achievement-locked'}`;
        el.innerHTML = `
          <div class="gd-achievement-icon">${achievement.icon || '🏆'}</div>
          <div class="gd-achievement-info">
            <div class="gd-achievement-name">${achievement.title || achievement.id}</div>
            <div class="gd-achievement-desc">${achievement.description || '暂无描述'}</div>
            <div class="gd-achievement-meta">${unlocked ? '已解锁' : '完成对应任务后解锁'}</div>
          </div>
        `;
        list.appendChild(el);
      }
    }

    /**
     * 渲染毕业结局面板：展示结局名称、描述、属性雷达与 NPC 关系摘要。
     */
    _renderEndingPanel() {
      const body = document.getElementById('gd-ending-body');
      if (!body) return;
      const qm = this._getQuestManager();
      let ending = null;
      try {
        ending = qm?.ending || qm?.progress?.ending || null;
      } catch (e) {}

      if (!ending || !ending.type) {
        body.innerHTML = `
          <div class="hw-empty-state gd-empty-state">
            <div class="gd-ending-empty-mark">—</div>
            <div>尚未毕业</div>
            <div class="hw-text-muted">完成毕业典礼后将在这里展示你的毕业结局</div>
          </div>
        `;
        return;
      }

      const dims = ending.dimensions || {};
      const maxDim = Math.max(100, dims.knowledge || 0, dims.social || 0, dims.stamina || 0, dims.achievements * 10 || 0, dims.npcRelations || 0);
      const dimBar = (label, value, color) => `
        <div class="gd-ending-stat-row">
          <span class="gd-ending-stat-label">${label}</span>
          <div class="hw-progress" style="flex:1;height:8px;margin:0 10px;">
            <div class="hw-progress-bar" style="width:${Math.min(100, (value / maxDim) * 100)}%;background:${color};"></div>
          </div>
          <span class="gd-ending-stat-value">${value}</span>
        </div>
      `;

      const relationSummary = ending.npcRelations || {};
      const relationCount = relationSummary.count || 0;
      const relationAverage = typeof relationSummary.average === 'number' ? Math.round(relationSummary.average) : (dims.npcRelations || 0);

      let relationsHtml = '';
      if (qm && typeof qm.getNpcRelation === 'function' && relationCount > 0) {
        const rows = Object.entries(qm.npcRelations || {})
          .sort((a, b) => (b[1].affinity || 0) - (a[1].affinity || 0))
          .slice(0, 6)
          .map(([npcId, relation]) => {
            const npc = getNpcById(npcId) || { name: npcId };
            return `<div class="gd-ending-npc-row"><span>${npc.name || npcId}</span><span class="hw-badge">${relation.affinity || 0}</span></div>`;
          }).join('');
        relationsHtml = rows ? `<div class="gd-section-title">NPC 关系摘要</div><div class="hw-card" style="margin-bottom:16px;">${rows}</div>` : '';
      }

      body.innerHTML = `
        <div class="gd-ending-hero">
          <div class="hw-panel-kicker">四年档案 · GRADUATION</div>
          <div class="gd-ending-hero-title">${ending.title || '毕业结局'}</div>
          <div class="gd-ending-hero-meta">已完成毕业典礼 · 校园经历归档</div>
        </div>
        <div class="gd-ending-summary">
          <div>${ending.description || ''}</div>
        </div>
        <div class="gd-section-title gd-ending-section-title">成长维度</div>
        <div class="gd-ending-dimensions">
          ${dimBar('知识', dims.knowledge || 0, 'var(--hw-hust-blue)')}
          ${dimBar('社交', dims.social || 0, 'var(--hw-vivid-green)')}
          ${dimBar('体能', dims.stamina || 0, 'var(--hw-gold)')}
          ${dimBar('成就', (dims.achievements || 0) * 10, 'var(--hw-purple, #9b59b6)')}
          ${dimBar('平均关系', dims.npcRelations || 0, 'var(--hw-rose, #e91e63)')}
        </div>
        ${relationsHtml}
      `;
    }

    _skillCategoryLabel(category) {
      return { study: '学习', sport: '体育', social: '社交', exploration: '探索', career: '职业' }[category] || '综合';
    }

    _skillEffectText(effects = {}) {
      const labels = {
        examBonus: '考试加成', runningBonus: '跑步加成', socialBonus: '社交加成',
        explorationBonus: '探索加成', staminaCostReduction: '体力消耗降低',
        knowledgeGainBonus: '知识收益', moodGainBonus: '心情收益'
      };
      const parts = Object.entries(effects || {}).map(([key, value]) => `${labels[key] || key} +${Math.round(Number(value || 0) * 100)}%`);
      return parts.length ? parts.join(' · ') : '继续提升熟练度以强化效果';
    }

    _skillUnlockText(conditions = {}) {
      if (conditions.completedQuest) return `完成任务 ${conditions.completedQuest}`;
      if (conditions.level) return `角色达到 Lv.${conditions.level}`;
      if (conditions.prerequisiteSkill) return `掌握前置技能 ${conditions.prerequisiteSkill}`;
      return '推进对应校园经历';
    }

    openPanel(name) {
      if (!this.container) this.init();
      this.closePanel();
      this.currentPanel = name;
      this._renderPanel(name);
      this.overlay.classList.add('gd-open');
      const panel = this.container.querySelector(`#gd-panel-${name}`);
      if (panel) panel.classList.add('gd-open');
    }

    closePanel() {
      this.overlay.classList.remove('gd-open');
      for (const panel of this.container.querySelectorAll('.gd-panel')) {
        panel.classList.remove('gd-open');
      }
      this.currentPanel = null;
    }

    openQuestLog() {
      if (typeof window !== 'undefined' && window.questTriggerUI && window.questTriggerUI.toggle) {
        window.questTriggerUI.toggle();
      } else if (typeof window !== 'undefined' && window.questTriggerUI && window.questTriggerUI.show) {
        window.questTriggerUI.show();
      } else {
        this._showToast('任务日志暂未接入，请按 J 键打开', 'info');
      }
    }

    toggleMap() {
      if (typeof document !== 'undefined' && document.body?.classList.contains('hw-game-page')) {
        window.location.href = '/map/';
        return;
      }
      if (typeof window !== 'undefined' && window.panelToggle) {
        window.panelToggle.click();
      } else {
        const toggle = document.getElementById('panelToggle');
        if (toggle) toggle.click();
      }
    }

    useItem(itemId) {
      const inv = this._getInventoryManager();
      if (!inv || !inv.useItem) {
        this._showError('物品系统暂不可用');
        return;
      }
      let result;
      try {
        result = inv.useItem(itemId, 1, 'dashboard');
      } catch (e) {
        this._showError('使用物品失败');
        return;
      }
      if (result && result.success) {
        this._showToast(`使用了 ${result.item && result.item.name ? result.item.name : itemId}`, 'success');
        this.refreshAll();
        const sm = this._getSaveManager();
        if (sm && sm.save) {
          sm.save().catch(() => {});
        }
      } else {
        this._showToast(result && result.message ? result.message : '使用失败', 'warning');
      }
    }

    async manualSave() {
      const sm = this._getSaveManager();
      if (!sm || !sm.save) {
        this._showError('存档系统未就绪');
        return;
      }
      this._showSaveStatus(this._t('saveStatusSaving'), true);
      try {
        await sm.save();
        this.lastSaveAt = new Date().toISOString();
        this._showSaveStatus(this._t('saveStatusSaved'), false);
        this._showToast('进度已保存', 'success');
        setTimeout(() => this._hideSaveStatus(), 2000);
      } catch (error) {
        this._showSaveStatus(this._t('saveStatusFailed'), false);
        this._showError('保存失败：' + (error.message || '未知错误') + '，进度已保留在本地');
        setTimeout(() => this._hideSaveStatus(), 3000);
      }
    }

    _showSaveStatus(text, saving) {
      if (!this.saveStatusEl) return;
      const statusText = this.saveStatusEl.querySelector('#gd-save-status-text');
      if (statusText) statusText.textContent = text;
      this.saveStatusEl.classList.add('gd-visible');
      if (saving) this.saveStatusEl.classList.add('gd-save-status-saving');
      else this.saveStatusEl.classList.remove('gd-save-status-saving');
    }

    _hideSaveStatus() {
      if (this.saveStatusEl) this.saveStatusEl.classList.remove('gd-visible');
    }

    _autoSaveBeforeUnload() {
      const sm = this._getSaveManager();
      if (sm && sm.saveLocalSync) {
        try { sm.saveLocalSync(); } catch (e) {}
      }
    }

    _startAutoRefresh() {
      if (this.refreshTimer) return;
      this.refreshTimer = setInterval(() => this.refreshAll(), 3000);
    }

    returnHome() {
      this._autoSaveBeforeUnload();
      const startScreen = document.getElementById('start-screen');
      if (startScreen) {
        startScreen.style.display = 'flex';
        const loading = document.getElementById('loading-screen');
        if (loading) loading.style.display = 'none';
      } else {
        window.location.reload();
      }
    }

    /**
     * 可访问性 5.2a：渲染键盘快捷键说明面板。
     * 覆盖已有面板使用统一遮罩，支持 role="dialog" aria-modal="true" aria-labelledby。
     */
    _renderHelpPanel() {
      const body = document.getElementById('gd-help-body');
      if (!body) return;
      const items = this.lang === 'zh' ? [
        ['WASD / 方向键', '移动角色'],
        ['空格', '与 NPC / 场景互动'],
        ['I', '打开背包'],
        ['Q', '打开任务日志'],
        ['M', '打开校园地图'],
        ['Esc', '关闭当前面板'],
        ['E', '打开 / 关闭巴士路线'],
        ['F', '地标打卡'],
        ['P', '拍照打卡'],
        ['T', '成就面板'],
        ['H', '帮助面板']
      ] : [
        ['WASD / Arrows', 'Move character'],
        ['Space', 'Interact with NPC / scene'],
        ['I', 'Open inventory'],
        ['Q', 'Open quest log'],
        ['M', 'Open campus map'],
        ['Esc', 'Close current panel'],
        ['E', 'Toggle bus routes'],
        ['F', 'Landmark check-in'],
        ['P', 'Photo check-in'],
        ['T', 'Achievements panel'],
        ['H', 'Help panel']
      ];

      body.innerHTML = `
        <p class="hw-text-muted" style="margin-bottom:14px;">${this._t('helpIntro')}</p>
        <div class="gd-help-grid">
          ${items.map(([key, desc]) => `
            <div class="gd-help-item">
              <kbd class="gd-help-key">${key}</kbd>
              <span class="gd-help-desc">${desc}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    /**
     * 可访问性 5.2b：Toast 进入动画遵循用户减少动画偏好，
     * prefers-reduced-motion 开启时直接显示不播放过渡。
     */
    _showToast(message, type = 'info') {
      if (typeof window !== 'undefined' && window.UIFeedback) {
        window.UIFeedback.showToast(message, type, 3000);
      } else {
        const container = document.getElementById('hw-toast-container');
        if (container) {
          const toast = document.createElement('div');
          toast.className = `hw-toast hw-toast-${type}`;
          toast.textContent = message;
          container.appendChild(toast);

          if (this._reducedMotion) {
            toast.classList.add('hw-show');
            setTimeout(() => { toast.remove(); }, 3000);
          } else {
            setTimeout(() => toast.classList.add('hw-show'), 20);
            setTimeout(() => { toast.classList.remove('hw-show'); setTimeout(() => toast.remove(), 250); }, 3000);
          }
        }
      }
    }

    _showError(message) {
      if (typeof window !== 'undefined' && window.UIFeedback) {
        window.UIFeedback.showError(document.body, message);
      } else {
        this._showToast(message, 'error');
      }
    }
  }

  function getInstance() {
    if (!instance) instance = new Dashboard();
    return instance;
  }

  const publicAPI = { init: () => getInstance().init(), getInstance, setLanguage: (lang) => getInstance().setLanguage(lang) };
  if (typeof window !== 'undefined') window.GameDashboardUI = publicAPI;
  return publicAPI;
})();

export default GameDashboardUI;
