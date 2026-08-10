import questTriggerManager from '../managers/QuestTriggerManager.js';
import { getItemById } from '../config/ItemConfig.js';
import {
  QUEST_STATUS,
  QUEST_TYPE,
  QUEST_CATEGORY,
  SPECIAL_LOCATIONS,
  SIDE_QUEST_CONFIG,
  SIDE_QUEST_GROUPS,
  distanceBetween,
  resolveQuestLocation,
  normalizeQuestConfig,
  getAllNormalizedQuests,
  getQuestRecommendedStatsText,
  getQuestById
} from '../config/QuestTriggerConfig.js';

class QuestTriggerUI {
  constructor() {
    this.initialized = false;
    this.panelEl = null;
    this.overlayEl = null;
    this.statusBarEl = null;
    this.trackerEl = null;
    this.promptEl = null;
    this.toastContainer = null;
    this.styleEl = null;
    this.activeTab = 'active';
    this.selectedQuestId = null;
    this.selectedQuestKind = 'main';
    this.listeners = [];
    this._keydownHandler = null;
    this._questMarks = [];
    this._lastStatusVisible = true;
    this._initializedManagers = false;
  }

  init() {
    if (this.initialized) return;
    this._ensureStyles();
    this._buildDom();
    this._bindEvents();
    this._bindManagerListeners();
    this._restoreTracking();
    this._renderTracker();
    this.initialized = true;
    window.questTriggerUI = this;
  }

  _ensureStyles() {
    if (this.styleEl) return;
    if (!document.getElementById('gameplay-panels-styles')) {
      const link = document.createElement('link');
      link.id = 'gameplay-panels-styles';
      link.rel = 'stylesheet';
      link.href = '/game/css/gameplay-panels.css';
      document.head.appendChild(link);
    }
    this.styleEl = document.createElement('style');
    this.styleEl.id = 'quest-trigger-ui-styles';
    this.styleEl.textContent = `
      .quest-ui-overlay { position: fixed; inset: 0; z-index: 9000; display: none; align-items: center; justify-content: center; background: rgba(8,11,20,.72); padding: 16px; backdrop-filter: blur(6px); }
      .quest-ui-panel { width: min(980px, 96vw); height: min(720px, 88vh); max-height: 88vh; min-height: 0; display: flex; flex-direction: column; background: linear-gradient(155deg, rgba(8,18,32,.98), rgba(18,34,55,.97)); border: 1px solid rgba(159,181,214,.2); border-radius: 10px; box-shadow: 0 30px 90px rgba(0,0,0,.58); color: #eef4fb; font-family: var(--hw-font-sans, "Segoe UI Variable", "Microsoft YaHei UI", sans-serif); overflow: hidden; }
      .quest-ui-panel::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, #F5C542, #1E6FDF, transparent); opacity: .7; }
      .quest-ui-header { position: relative; display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid rgba(148,163,184,.12); }
      .quest-ui-title { margin: 0; font-family: var(--hw-font-serif, "Source Han Serif SC", "STZhongsong", serif); font-size: 20px; color: #F3D484; letter-spacing: 0; }
      .quest-ui-close { width: 32px; height: 32px; border: 0; border-radius: 999px; background: transparent; color: #94a3b8; font-size: 22px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .15s ease-out, color .15s ease-out; }
      .quest-ui-close:hover { background: rgba(255,255,255,.08); color: #F5C542; }
      .quest-ui-tabs { display: flex; flex: 0 0 auto; gap: 4px; padding: 8px 16px; border-bottom: 1px solid rgba(148,163,184,.12); overflow-x: auto; }
      .quest-ui-tab { flex: none; min-height: 34px; padding: 7px 13px; border-radius: 6px; border: 1px solid transparent; background: transparent; color: #9cabbd; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; transition: color .15s ease-out, background .15s ease-out, border-color .15s ease-out; }
      .quest-ui-tab:hover { color: #F8FAFC; background: rgba(255,255,255,.03); }
      .quest-ui-tab.active { background: rgba(34,189,208,.12); color: #8be5ef; border-color: rgba(34,189,208,.32); }
      .quest-ui-body { flex: 1 1 auto; min-height: 0; overflow: hidden; padding: 16px 18px 18px; display: grid; grid-template-columns: minmax(290px,.86fr) minmax(0,1.14fr); gap: 18px; }
      .quest-ui-list { min-width: 0; min-height: 0; overflow-y: auto; padding-right: 6px; display: flex; flex-direction: column; gap: 10px; align-content: start; }
      .quest-ui-detail { min-width: 0; min-height: 0; overflow-y: auto; padding: 2px 8px 12px 2px; display: flex; flex-direction: column; gap: 12px; }
      .quest-card { flex: 0 0 auto; min-height: 86px; background: rgba(255,255,255,.035); border: 1px solid rgba(148,163,184,.14); border-radius: 8px; padding: 12px 14px; cursor: pointer; overflow: hidden; transition: background .15s ease-out, border-color .15s ease-out, transform .15s ease-out; }
      .quest-card:hover { background: rgba(255,255,255,.05); border-color: rgba(245,197,66,.35); transform: translateY(-1px); }
      .quest-card.selected { background: rgba(245,197,66,.08); border-color: rgba(245,197,66,.45); box-shadow: 0 0 0 3px rgba(245,197,66,.08); }
      .quest-card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
      .quest-card-title { padding-right: 54px; font-size: 14px; font-weight: 750; line-height: 1.45; color: #F8FAFC; margin: 0 0 6px; overflow-wrap: anywhere; }
      .quest-card-tags { display: flex; gap: 6px; flex-wrap: wrap; }
      .quest-tag { font-size: 11px; padding: 3px 8px; border-radius: 999px; font-weight: 700; }
      .quest-tag-type { background: rgba(96,165,250,.18); color: #93c5fd; border: 1px solid rgba(96,165,250,.2); }
      .quest-tag-status { background: rgba(255,255,255,.06); color: #cbd5e1; border: 1px solid rgba(255,255,255,.08); }
      .quest-tag-status.ACTIVE { background: rgba(0,201,167,.12); color: #00C9A7; border-color: rgba(0,201,167,.2); }
      .quest-tag-status.AVAILABLE { background: rgba(245,197,66,.12); color: #F5C542; border-color: rgba(245,197,66,.2); }
      .quest-tag-status.READY_TO_COMPLETE { background: rgba(59,130,246,.18); color: #60a5fa; border-color: rgba(59,130,246,.2); }
      .quest-tag-status.COMPLETED { background: rgba(107,114,128,.18); color: #9ca3af; border-color: rgba(107,114,128,.2); }
      .quest-empty { color: #94a3b8; text-align: center; padding: 48px 16px; font-size: 14px; }
      .quest-detail-title { font-family: var(--hw-font-serif, "Source Han Serif SC", "STZhongsong", serif); font-size: 19px; font-weight: 700; color: #F3D484; margin: 0 0 8px; letter-spacing: 0; overflow-wrap: anywhere; }
      .quest-detail-section { background: rgba(255,255,255,.03); border: 1px solid rgba(148,163,184,.12); border-radius: 10px; padding: 10px 12px; }
      .quest-detail-label { font-size: 12px; color: #94a3b8; margin-bottom: 4px; font-weight: 600; }
      .quest-detail-text { font-size: 13px; color: #e5e7eb; line-height: 1.6; }
      .quest-objective { display: grid; grid-template-columns: minmax(0,1fr) auto; align-items: start; gap: 12px; font-size: 13px; line-height: 1.55; padding: 6px 0; border-bottom: 1px solid rgba(148,163,184,.08); }
      .quest-progress-bar { height: 6px; background: rgba(255,255,255,.06); border-radius: 999px; overflow: hidden; margin-top: 6px; }
      .quest-progress-fill { height: 100%; background: linear-gradient(90deg, #1E6FDF, #00C9A7); border-radius: 999px; transition: width .35s ease-out; }
      .quest-reward-list { display: flex; flex-wrap: wrap; gap: 6px; }
      .quest-reward { font-size: 12px; padding: 4px 8px; border-radius: 6px; background: rgba(245,197,66,.12); color: #F5C542; border: 1px solid rgba(245,197,66,.2); font-weight: 600; }
      .quest-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
      .quest-status-bar { position: fixed; top: 12px; left: 50%; transform: translateX(-50%); z-index: 8000; display: flex; gap: 10px; align-items: center; padding: 8px 16px; background: rgba(15,23,42,.96); border: 1px solid rgba(245,197,66,.2); border-radius: 999px; color: #F5C542; font-size: 13px; font-weight: 700; box-shadow: 0 6px 24px rgba(0,0,0,.32); }
      .quest-tracker { position: fixed; top: 56px; left: 50%; transform: translateX(-50%); z-index: 8001; display: flex; align-items: center; gap: 10px; padding: 8px 16px; background: rgba(15,23,42,.96); border: 1px solid rgba(245,197,66,.2); border-radius: 12px; color: #e5e7eb; font-size: 13px; max-width: min(600px, 92vw); box-shadow: 0 8px 24px rgba(0,0,0,.32); }
      .quest-tracker-title { color: #F5C542; font-weight: 700; }
      .quest-tracker-hint { color: #94a3b8; }
      .quest-prompt { position: fixed; bottom: 120px; left: 50%; transform: translateX(-50%); z-index: 8500; display: none; padding: 10px 22px; background: rgba(15,23,42,.96); border: 1px solid rgba(245,197,66,.3); border-radius: 12px; color: #F5C542; font-size: 14px; font-weight: 700; box-shadow: 0 10px 30px rgba(0,0,0,.4); }
      .quest-toast-container { position: fixed; top: 90px; left: 50%; transform: translateX(-50%); z-index: 10000; display: flex; flex-direction: column; align-items: center; gap: 8px; pointer-events: none; }
      .quest-toast { max-width: min(480px, 92vw); padding: 10px 18px; background: rgba(15,23,42,.96); border: 1px solid rgba(245,197,66,.45); border-radius: 8px; color: #F5C542; font-size: 13px; font-weight: 600; box-shadow: 0 18px 50px rgba(0,0,0,.48); opacity: 0; transform: translateY(-8px); transition: opacity .2s, transform .2s; pointer-events: auto; }
      .quest-toast.show { opacity: 1; transform: translateY(0); }
      @media (max-width: 760px) { .quest-ui-panel { width: 100vw; height: 92dvh; max-height: 92dvh; } .quest-ui-header { padding: 13px 16px; } .quest-ui-summary { display: none; } .quest-ui-body { grid-template-columns: 1fr; grid-template-rows: minmax(190px,.8fr) minmax(0,1.2fr); padding: 12px; gap: 12px; } .quest-ui-list { padding-right: 3px; } .quest-ui-detail { border-top: 1px solid rgba(148,163,184,.12); padding: 12px 3px 10px; } .quest-card { min-height: 82px; } }
    `;
    document.head.appendChild(this.styleEl);
  }

  _buildDom() {
    this.overlayEl = document.createElement('div');
    this.overlayEl.className = 'quest-ui-overlay';
    this.overlayEl.id = 'quest-log-overlay';
    this.overlayEl.innerHTML = `
      <div class="quest-ui-panel" id="quest-log-panel">
        <div class="quest-ui-header">
          <div class="quest-ui-header-copy">
            <h2 class="quest-ui-title">任务日志</h2>
            <div class="quest-ui-summary">追踪目标、查看奖励并规划你的校园日程</div>
          </div>
          <button class="quest-ui-close" id="quest-log-close" aria-label="关闭任务日志">✕</button>
        </div>
        <div class="quest-ui-tabs" id="quest-log-tabs"></div>
        <div class="quest-ui-body" id="quest-log-body">
          <div class="quest-ui-list" id="quest-list"></div>
          <div class="quest-ui-detail" id="quest-detail"></div>
        </div>
      </div>
    `;
    document.body.appendChild(this.overlayEl);

    this.statusBarEl = document.createElement('div');
    this.statusBarEl.className = 'quest-status-bar';
    this.statusBarEl.id = 'quest-status-bar';
    this.statusBarEl.style.display = 'none';
    this.statusBarEl.innerHTML = '<span id="quest-status-text">暂无任务</span>';
    document.body.appendChild(this.statusBarEl);

    this.trackerEl = document.createElement('div');
    this.trackerEl.className = 'quest-tracker';
    this.trackerEl.id = 'quest-tracker';
    this.trackerEl.style.display = 'none';
    this.trackerEl.innerHTML = `
      <span class="quest-tracker-title">当前追踪</span>
      <span id="quest-tracker-name">无</span>
      <span class="quest-tracker-hint" id="quest-tracker-hint"></span>
    `;
    document.body.appendChild(this.trackerEl);

    this.promptEl = document.createElement('div');
    this.promptEl.className = 'quest-prompt';
    this.promptEl.id = 'quest-map-prompt';
    document.body.appendChild(this.promptEl);

    this.toastContainer = document.createElement('div');
    this.toastContainer.className = 'quest-toast-container';
    this.toastContainer.id = 'quest-toast-container';
    document.body.appendChild(this.toastContainer);
  }

  _bindEvents() {
    this.overlayEl.addEventListener('click', (e) => {
      if (e.target === this.overlayEl) this.hidePanel();
    });
    const closeBtn = document.getElementById('quest-log-close');
    if (closeBtn) closeBtn.addEventListener('click', () => this.hidePanel());
    this._keydownHandler = (e) => this._handleKey(e);
    document.addEventListener('keydown', this._keydownHandler);
  }

  _handleKey(e) {
    const target = e.target;
    const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true');
    if (isTyping) return;
    const dialogOpen = document.querySelector('.npc-dialogue-overlay')?.style.display === 'flex';
    const battleOpen = document.getElementById('battle-container')?.style.display === 'block';
    const mapPoiOpen = document.getElementById('quest-poi-panel')?.style.display === 'block';
    if (e.key === 'Escape') {
      if (this.isPanelOpen()) {
        this.hidePanel();
        e.preventDefault();
      } else if (this.promptEl?.style.display === 'block') {
        this.hidePrompt();
        e.preventDefault();
      }
      return;
    }
    if (e.key === 'j' || e.key === 'J') {
      if (dialogOpen || battleOpen || mapPoiOpen) return;
      this.togglePanel();
      e.preventDefault();
      return;
    }
    if (e.key === 'e' || e.key === 'E') {
      if (dialogOpen || battleOpen || this.isPanelOpen() || mapPoiOpen) return;
      this._triggerNearbyQuest();
      e.preventDefault();
      return;
    }
  }

  _bindManagerListeners() {
    const qm = this._getQuestManager();
    if (!qm) return;
    const events = [
      'quest:available', 'quest:locationReached', 'quest:leftLocation',
      'quest:activated', 'quest:completed', 'quest:readyToComplete',
      'sideQuest:available', 'sideQuest:activated', 'sideQuest:completed',
      'phase:advanced', 'game:completed'
    ];
    for (const event of events) {
      const cleanup = qm.addListener(event, () => this._onQuestUpdate());
      this.listeners.push(cleanup);
    }
  }

  _onQuestUpdate() {
    this._renderTracker();
    this._renderStatusBar();
    this._renderQuestList();
    this._renderQuestDetail();
    this.updateMapMarkers();
  }

  _getQuestManager() {
    return questTriggerManager || window.questTriggerManager || null;
  }

  _getSaveManager() {
    return window.saveManager || (window.gameSystem?.saveManager) || null;
  }

  _getMapIntegration() {
    return window.questMapIntegration || null;
  }

  _restoreTracking() {
    const sm = this._getSaveManager();
    if (!sm) return;
    const progress = sm.getProgress?.() || {};
    this.selectedQuestId = progress.trackedQuestId || null;
    this.selectedQuestKind = progress.trackedQuestKind || 'main';
  }

  _saveTracking() {
    const sm = this._getSaveManager();
    if (!sm) return;
    sm.setProgressField?.('trackedQuestId', this.selectedQuestId);
    sm.setProgressField?.('trackedQuestKind', this.selectedQuestKind);
    const qmi = this._getMapIntegration();
    if (qmi) {
      sm.setProgressField?.('trackedQuestGroup', qmi.trackedBinding?.group || null);
      sm.setProgressField?.('trackedPoiId', qmi.trackedPoi?.map_id || null);
    }
  }

  togglePanel() {
    if (this.isPanelOpen()) this.hidePanel();
    else this.showPanel();
  }

  isPanelOpen() {
    return this.overlayEl?.style.display === 'flex';
  }

  showPanel() {
    this._renderTracker();
    this._renderStatusBar();
    this._renderTabs();
    this._renderQuestList();
    this._renderQuestDetail();
    if (this.overlayEl) this.overlayEl.style.display = 'flex';
  }

  hidePanel() {
    if (this.overlayEl) this.overlayEl.style.display = 'none';
  }

  toggleStatusBar() {
    this.togglePanel();
  }

  _renderTabs() {
    const tabs = [
      { id: 'active', label: '当前任务' },
      { id: 'main', label: '主线' },
      { id: 'side', label: '支线' },
      { id: 'club', label: '社团' },
      { id: 'running', label: '跑步' },
      { id: 'exploration', label: '探索' },
      { id: 'completed', label: '已完成' }
    ];
    const container = document.getElementById('quest-log-tabs');
    if (!container) return;
    container.innerHTML = tabs.map(t => `
      <button class="quest-ui-tab ${this.activeTab === t.id ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>
    `).join('');
    container.querySelectorAll('.quest-ui-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.dataset.tab;
        this.selectedQuestId = null;
        this._renderTabs();
        this._renderQuestList();
        this._renderQuestDetail();
      });
    });
  }

  _getVisibleQuests() {
    const qm = this._getQuestManager();
    if (!qm) return [];
    const all = qm.getAllQuestsWithStatus?.() || getAllNormalizedQuests().map(q => ({ ...q, status: qm.questStatus?.[q.id] || qm.sideQuestStatus?.[q.id] || QUEST_STATUS.LOCKED }));
    const completed = new Set(qm.getCompletedQuests?.() || []);
    const activeId = qm.getActiveQuest?.() || null;
    const trackedId = qm.trackedQuestId || null;
    const enriched = all.map(q => {
      const isMain = qm._isMainQuest ? qm._isMainQuest(q.id) : !!getQuestById(q.id);
      const detail = isMain ? qm.getQuestDetail?.(q.id) : qm.getSideQuestDetail?.(q.id);
      const status = q.status || detail?.status || QUEST_STATUS.LOCKED;
      const isActive = q.id === activeId;
      const isTracked = q.id === trackedId;
      return { ...q, ...detail, isMain, status, isActive, isTracked, isCompleted: completed.has(q.id) || status === QUEST_STATUS.COMPLETED };
    });
    switch (this.activeTab) {
      case 'active': return enriched.filter(q => q.status === QUEST_STATUS.ACTIVE || q.status === QUEST_STATUS.READY_TO_COMPLETE || q.isActive);
      case 'main': return enriched.filter(q => q.isMain && !q.isCompleted);
      case 'side': return enriched.filter(q => !q.isMain && !q.isCompleted && q.category === QUEST_CATEGORY.SIDE);
      case 'club': return enriched.filter(q => !q.isMain && q.category === QUEST_CATEGORY.CLUB && !q.isCompleted);
      case 'running': return enriched.filter(q => !q.isMain && q.category === QUEST_CATEGORY.RUNNING && !q.isCompleted);
      case 'exploration': return enriched.filter(q => !q.isMain && q.category === QUEST_CATEGORY.EXPLORATION && !q.isCompleted);
      case 'completed': return enriched.filter(q => q.isCompleted);
      default: return enriched;
    }
  }

  _renderQuestList() {
    const container = document.getElementById('quest-list');
    if (!container) return;
    const quests = this._getVisibleQuests();
    if (quests.length === 0) {
      container.innerHTML = `<div class="quest-empty">📭 这里还没有任务，去校园里逛逛吧</div>`;
      return;
    }
    container.innerHTML = quests.map(q => this._renderQuestCard(q)).join('');
    container.querySelectorAll('.quest-card').forEach(card => {
      const selectCard = () => {
        this.selectedQuestId = card.dataset.questId;
        this.selectedQuestKind = card.dataset.kind || 'main';
        this._renderQuestList();
        this._renderQuestDetail();
      };
      card.addEventListener('click', selectCard);
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectCard();
        }
      });
    });
  }

  _renderQuestCard(q) {
    const typeLabel = this._typeLabel(q.category || q.type);
    const statusLabel = this._statusLabel(q.status);
    const phaseLabel = q.phaseName || q.phase || '任意学期';
    const selected = q.id === this.selectedQuestId ? 'selected' : '';
    const tracked = q.isTracked ? 'is-tracked' : '';
    return `
      <div class="quest-card ${selected} ${tracked}" data-quest-id="${q.id}" data-kind="${q.isMain ? 'main' : 'side'}" tabindex="0" role="button">
        <div class="quest-card-header">
          <div>
            <div class="quest-card-title">${this._stripEmoji(q.title || q.name)}</div>
            <div class="quest-card-tags">
              <span class="quest-tag quest-tag-type">${typeLabel}</span>
              <span class="quest-tag quest-tag-status ${q.status}">${statusLabel}</span>
            </div>
          </div>
        </div>
        <div style="font-size:12px;color:#9ca3af;margin-top:6px;">${phaseLabel} · ${q.locationName || '无地点'}</div>
      </div>
    `;
  }

  _renderQuestDetail() {
    const container = document.getElementById('quest-detail');
    if (!container) return;
    if (!this.selectedQuestId) {
      container.innerHTML = `<div class="quest-empty">选择左侧任务查看详情</div>`;
      return;
    }
    const qm = this._getQuestManager();
    const isMain = qm?._isMainQuest ? qm._isMainQuest(this.selectedQuestId) : this.selectedQuestKind === 'main';
    const detail = isMain ? qm?.getQuestDetail?.(this.selectedQuestId) : qm?.getSideQuestDetail?.(this.selectedQuestId);
    if (!detail) {
      const fallback = getQuestById(this.selectedQuestId);
      container.innerHTML = fallback
        ? `<div class="quest-empty">已加载基础任务信息，详情待解锁</div>`
        : `<div class="quest-empty">任务详情不可用</div>`;
      return;
    }
    const objectives = detail.objectiveProgress?.objectives || detail.objectives || [];
    const rewards = detail.rewards || {};
    const rewardTags = this._renderRewardTags(rewards);
    const prereqText = this._renderPrerequisites(detail);
    const canTrack = !!(detail.location || detail.locationName || detail.poiId || detail.sceneId || detail.npcId);
    const canAbandon = !isMain && detail.canAbandon !== false && detail.status === QUEST_STATUS.ACTIVE;
    const isCompleted = detail.status === QUEST_STATUS.COMPLETED;
    const isActive = detail.status === QUEST_STATUS.ACTIVE;
    const isAvailable = detail.status === QUEST_STATUS.AVAILABLE || detail.status === QUEST_STATUS.PREREQ_MET;
    container.innerHTML = `
      <div>
        <div class="quest-detail-title">${this._stripEmoji(detail.title || detail.name)}</div>
        <div class="quest-card-tags" style="margin-bottom:8px;">
          <span class="quest-tag quest-tag-type">${this._typeLabel(detail.category || detail.type)}</span>
          <span class="quest-tag quest-tag-status ${detail.status}">${this._statusLabel(detail.status)}</span>
        </div>
      </div>
      <div class="quest-detail-section">
        <div class="quest-detail-label">所属学期/阶段</div>
        <div class="quest-detail-text">${detail.phaseName || detail.phase || '任意学期'}</div>
      </div>
      <div class="quest-detail-section">
        <div class="quest-detail-label">任务描述</div>
        <div class="quest-detail-text">${detail.description || '暂无描述'}</div>
      </div>
      <div class="quest-detail-section">
        <div class="quest-detail-label">目标进度</div>
        ${objectives.length ? objectives.map(o => this._renderObjective(o)).join('') : '<div class="quest-detail-text">无明确目标</div>'}
      </div>
      <div class="quest-detail-section">
        <div class="quest-detail-label">奖励预览</div>
        <div class="quest-reward-list">${rewardTags}</div>
      </div>
      <div class="quest-detail-section">
        <div class="quest-detail-label">推荐地点 / NPC</div>
        <div class="quest-detail-text">${this._renderLocationNpc(detail)}</div>
      </div>
      ${prereqText ? `<div class="quest-detail-section"><div class="quest-detail-label">前置条件</div><div class="quest-detail-text" style="color:#fca5a5;">${prereqText}</div></div>` : ''}
      <div class="quest-actions">
        ${isAvailable ? `<button class="quest-btn hw-button hw-button-primary" data-action="accept" data-id="${detail.id}" data-kind="${isMain ? 'main' : 'side'}">接受任务</button>` : ''}
        ${isActive ? `<button class="quest-btn hw-button hw-button-primary" data-action="complete" data-id="${detail.id}" data-kind="${isMain ? 'main' : 'side'}">完成任务</button>` : ''}
        ${canTrack ? `<button class="quest-btn hw-button hw-button-secondary" data-action="track" data-id="${detail.id}" data-kind="${isMain ? 'main' : 'side'}">追踪目标</button>` : ''}
        ${canTrack ? `<button class="quest-btn hw-button hw-button-secondary" data-action="locate" data-id="${detail.id}" data-kind="${isMain ? 'main' : 'side'}">校园地图</button>` : ''}
        ${canAbandon ? `<button class="quest-btn hw-button hw-button-danger" data-action="abandon" data-id="${detail.id}" data-kind="side">放弃任务</button>` : ''}
        ${isCompleted ? `<button class="quest-btn hw-button hw-button-secondary" data-action="locate" data-id="${detail.id}" data-kind="${isMain ? 'main' : 'side'}">校园地图</button>` : ''}
      </div>
    `;
    container.querySelectorAll('.quest-btn').forEach(btn => {
      btn.addEventListener('click', () => this._onDetailAction(btn.dataset.action, btn.dataset.id, btn.dataset.kind));
    });
  }

  _renderObjective(o) {
    const current = Number(o.current) || 0;
    const amount = Number(o.amount) || 1;
    const pct = Math.min(100, Math.round((current / amount) * 100));
    const desc = o.description || this._objectiveLabel(o.type, o.target);
    return `
      <div class="quest-objective">
        <span>${desc}</span>
        <span class="quest-objective-progress">${current}/${amount} · ${pct}%</span>
      </div>
      <div class="quest-progress-bar"><div class="quest-progress-fill" style="width:${pct}%"></div></div>
    `;
  }

  _renderRewardTags(rewards) {
    const parts = [];
    if (rewards.money) parts.push(`金币 +${rewards.money}`);
    if (rewards.experience) parts.push(`经验 +${rewards.experience}`);
    if (rewards.knowledge) parts.push(`知识 +${rewards.knowledge}`);
    if (rewards.social) parts.push(`社交 +${rewards.social}`);
    if (rewards.stamina) parts.push(`体能 ${rewards.stamina > 0 ? '+' : ''}${rewards.stamina}`);
    if (rewards.mood) parts.push(`心情 +${rewards.mood}`);
    if (rewards.items && rewards.items.length) {
      const names = rewards.items.map(i => {
        const itemId = typeof i === 'string' ? i : i.itemId || i.id;
        const item = itemId ? getItemById(itemId) : null;
        return item?.name || itemId || '物品';
      }).filter(Boolean);
      parts.push(`物品 ${names.join(', ')}`);
    }
    if (rewards.unlockSkills && rewards.unlockSkills.length) parts.push(`解锁技能 ${rewards.unlockSkills.join(', ')}`);
    if (rewards.proficiencyGain && typeof rewards.proficiencyGain === 'object') {
      if (Array.isArray(rewards.proficiencyGain)) {
        for (const gain of rewards.proficiencyGain) {
          if (gain?.subject) parts.push(`${gain.subject} 熟练度 +${gain.amount || 0}`);
        }
      } else if (rewards.proficiencyGain.subject) {
        parts.push(`${rewards.proficiencyGain.subject} 熟练度 +${rewards.proficiencyGain.amount || 0}`);
      }
    }
    if (parts.length === 0) return '<span class="quest-detail-text">无</span>';
    return parts.map(p => `<span class="quest-reward">${p}</span>`).join('');
  }

  _renderLocationNpc(detail) {
    const loc = detail.locationName || detail.location?.name || detail.poiId || '无';
    const npc = detail.npcId || '无';
    return `地点：${loc} · NPC：${npc}`;
  }

  _renderPrerequisites(detail) {
    if (detail.prerequisitesMet) return '';
    const missing = detail.missingPrerequisites || [];
    if (missing.length) return `需先完成：${missing.join('、')}`;
    if (detail.timeReason) return detail.timeReason;
    return '';
  }

  _onDetailAction(action, questId, kind) {
    const qm = this._getQuestManager();
    if (!qm) return;
    if (action === 'accept') {
      if (kind === 'main') qm.tryActivateQuest?.(questId);
      else qm.tryActivateSideQuest?.(questId) || qm.acceptSideQuest?.(questId);
      this._showToast('已接受任务', '#4ade80');
    } else if (action === 'complete') {
      if (kind === 'main') qm.completeQuest?.(questId);
      else qm.completeSideQuest?.(questId);
      this._showToast('任务完成', '#4ade80');
    } else if (action === 'abandon') {
      qm.sideQuestStatus[questId] = QUEST_STATUS.AVAILABLE;
      qm.activeQuest = null;
      this._showToast('已放弃任务', '#f87171');
    } else if (action === 'track') {
      this._trackQuest(questId, kind);
    } else if (action === 'locate') {
      this._trackQuest(questId, kind);
    }
    this._saveTracking();
    this._onQuestUpdate();
  }

  _trackQuest(questId, kind) {
    this.selectedQuestId = questId;
    this.selectedQuestKind = kind;
    const qm = this._getQuestManager();
    if (qm?.setTrackedQuest) qm.setTrackedQuest(questId, kind);
    const qmi = this._getMapIntegration();
    if (qmi?.trackQuest) qmi.trackQuest(questId, kind);
    this._saveTracking();
    this._showToast('已追踪任务', '#ffd700');
  }

  _renderTracker() {
    if (!this.trackerEl) return;
    const qm = this._getQuestManager();
    const tracked = qm?.getTrackedQuest?.() || null;
    const nameEl = document.getElementById('quest-tracker-name');
    const hintEl = document.getElementById('quest-tracker-hint');
    if (!tracked || !nameEl) {
      this.trackerEl.style.display = 'none';
      return;
    }
    this.trackerEl.style.display = 'flex';
    nameEl.textContent = this._stripEmoji(tracked.title || tracked.name);
    const objectives = tracked.objectiveProgress?.objectives || [];
    const next = objectives.find(o => (Number(o.current) || 0) < (Number(o.amount) || 1));
    hintEl.textContent = next ? `下一步：${next.description || this._objectiveLabel(next.type, next.target)}` : '可交付';
  }

  _renderStatusBar() {
    if (!this.statusBarEl) return;
    const qm = this._getQuestManager();
    if (!qm) {
      this.statusBarEl.style.display = 'none';
      return;
    }
    const active = qm.getActiveQuest?.() || qm.activeQuest || null;
    const available = qm.getAvailableQuests?.() || [];
    const textEl = document.getElementById('quest-status-text');
    if (!textEl) return;
    if (active) {
      const detail = qm.getQuestDetail?.(active) || qm.getSideQuestDetail?.(active) || { title: '进行中任务' };
      textEl.textContent = `进行中：${this._stripEmoji(detail.title || detail.name)}`;
    } else if (available.length) {
      textEl.textContent = `可触发：${this._stripEmoji(available[0].name)}`;
    } else {
      textEl.textContent = '暂无任务';
    }
    this.statusBarEl.style.display = 'flex';
  }

  _triggerNearbyQuest() {
    const qm = this._getQuestManager();
    if (!qm) return;
    const available = qm.getAvailableQuests?.() || [];
    if (available.length) {
      this._showPrompt(available[0], 'available');
    } else {
      const reached = qm.getLocationReachedQuests?.() || [];
      if (reached.length) this._showToast('前置条件未满足', '#fbbf24');
    }
  }

  _showPrompt(quest, kind) {
    if (!this.promptEl) return;
    this.promptEl.textContent = `按 E 触发：${this._stripEmoji(quest.name || quest.title || quest)}`;
    this.promptEl.style.display = 'block';
    setTimeout(() => this.hidePrompt(), 3500);
  }

  hidePrompt() {
    if (this.promptEl) this.promptEl.style.display = 'none';
  }

  _showToast(message, color = '#ffd700', duration = 2400) {
    if (!this.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'quest-toast';
    toast.style.color = color;
    toast.style.border = `1px solid ${color}`;
    toast.textContent = message;
    this.toastContainer.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 200); }, duration);
  }

  showQuestDetail(questId) {
    this.selectedQuestId = questId;
    this.selectedQuestKind = 'main';
    this.activeTab = 'main';
    this.showPanel();
  }

  showMultiQuestSelection(quests) {
    if (!quests || !quests.length) return;
    this._showPrompt(quests[0], 'multi');
  }

  updateMapMarkers() {
    const qmi = this._getMapIntegration();
    if (qmi?._updateQuestMarks) qmi._updateQuestMarks();
  }

  _drawQuestMarkers(ctx, coordSys) {
    const qmi = this._getMapIntegration();
    if (qmi?._drawQuestMarksOnMap) qmi._drawQuestMarksOnMap(ctx, coordSys);
  }

  _drawQuestMarkersPublic(ctx, coordSys) {
    this._drawQuestMarkers(ctx, coordSys);
  }

  destroy() {
    this.listeners.forEach(cleanup => cleanup?.());
    this.listeners = [];
    if (this._keydownHandler) document.removeEventListener('keydown', this._keydownHandler);
    this.overlayEl?.remove();
    this.statusBarEl?.remove();
    this.trackerEl?.remove();
    this.promptEl?.remove();
    this.toastContainer?.remove();
    this.styleEl?.remove();
  }

  _typeLabel(type) {
    const map = {
      [QUEST_CATEGORY.MAIN]: '主线',
      [QUEST_CATEGORY.SIDE]: '支线',
      [QUEST_CATEGORY.CLUB]: '社团',
      [QUEST_CATEGORY.RUNNING]: '跑步',
      [QUEST_CATEGORY.EXPLORATION]: '探索',
      [QUEST_CATEGORY.ACTIVITY]: '活动',
      [QUEST_TYPE.DIALOGUE]: '对话',
      [QUEST_TYPE.EXAM]: '考试',
      [QUEST_TYPE.SELF_STUDY]: '自习',
      [QUEST_TYPE.REST]: '休息',
      [QUEST_TYPE.TRAINING]: '军训'
    };
    return map[type] || type || '任务';
  }

  _statusLabel(status) {
    const map = {
      [QUEST_STATUS.LOCKED]: '未解锁',
      [QUEST_STATUS.LOCATION_REACHED]: '已到达',
      [QUEST_STATUS.PREREQ_MET]: '待触发',
      [QUEST_STATUS.AVAILABLE]: '可触发',
      [QUEST_STATUS.ACTIVE]: '进行中',
      [QUEST_STATUS.READY_TO_COMPLETE]: '可完成',
      [QUEST_STATUS.COMPLETED]: '已完成',
      [QUEST_STATUS.FAILED]: '失败',
      [QUEST_STATUS.EXPIRED]: '已过期'
    };
    return map[status] || status || '未知';
  }

  _objectiveLabel(type, target) {
    const map = {
      talk_to_npc: '与 NPC 对话',
      visit_location: '到达地点',
      enter_scene: '进入场景',
      complete_dialogue: '完成对话',
      join_club: '加入社团',
      attend_activity: '参加活动',
      run_distance: '跑步',
      pass_exam: '通过考试',
      collect_item: '收集物品',
      buy_item: '购买物品',
      use_item: '使用物品',
      increase_stat: '提升属性',
      wait_time: '等待',
      custom_event: '完成目标'
    };
    return `${map[type] || type}${target ? '：' + target : ''}`;
  }

  _stripEmoji(text) {
    if (!text) return '';
    return String(text).replace(/[\u{1F300}-\u{1F9FF}]/gu, '').replace(/[\u{2600}-\u{26FF}]/gu, '').replace(/[\u{2700}-\u{27BF}]/gu, '').trim();
  }
}

const questTriggerUI = new QuestTriggerUI();
export { QuestTriggerUI, questTriggerUI };
export default questTriggerUI;
