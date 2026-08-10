import { questPoiBinder } from './QuestPoiBinder.js';
import { MapEventConfig } from '../config/MapEventConfig.js';
import { QUEST_STATUS } from '../../../game/js/config/QuestTriggerConfig.js';
import { getNpcsByPoiId } from '../../../game/js/config/NpcConfig.js';
import { TYPES } from '../config.js';

const STATUS_LABELS = {
  [QUEST_STATUS.LOCKED]: '未解锁',
  [QUEST_STATUS.LOCATION_REACHED]: '未解锁',
  [QUEST_STATUS.PREREQ_MET]: '可接取',
  [QUEST_STATUS.AVAILABLE]: '可接取',
  [QUEST_STATUS.ACTIVE]: '进行中',
  [QUEST_STATUS.READY_TO_COMPLETE]: '可交付',
  [QUEST_STATUS.COMPLETED]: '已完成',
  [QUEST_STATUS.FAILED]: '失败',
  [QUEST_STATUS.EXPIRED]: '已过期'
};

const STATUS_COLORS = {
  [QUEST_STATUS.LOCKED]: '#64748b',
  [QUEST_STATUS.LOCATION_REACHED]: '#64748b',
  [QUEST_STATUS.PREREQ_MET]: '#4ade80',
  [QUEST_STATUS.AVAILABLE]: '#4ade80',
  [QUEST_STATUS.ACTIVE]: '#60a5fa',
  [QUEST_STATUS.READY_TO_COMPLETE]: '#fbbf24',
  [QUEST_STATUS.COMPLETED]: '#9ca3af',
  [QUEST_STATUS.FAILED]: '#f87171',
  [QUEST_STATUS.EXPIRED]: '#f87171'
};

const STATUS_BADGE_CLASS = {
  [QUEST_STATUS.PREREQ_MET]: 'hw-badge-success',
  [QUEST_STATUS.AVAILABLE]: 'hw-badge-success',
  [QUEST_STATUS.ACTIVE]: 'hw-badge-info',
  [QUEST_STATUS.READY_TO_COMPLETE]: 'hw-badge-warning',
  [QUEST_STATUS.COMPLETED]: 'hw-tag'
};

class QuestMapIntegration {
  constructor() {
    this.initialized = false;
    this.renderer = null;
    this.character = null;
    this.coordSys = null;
    this.mapData = null;
    this.eventBus = null;
    this.inputManager = null;

    this.proximityRadius = 120;
    this.nearbyPoi = null;
    this.lastEKey = false;
    this.trackedPoi = null;
    this.trackedBinding = null;
    this.panelOpen = false;

    this.panelEl = null;
    this.promptEl = null;
    this.questMarks = [];
    this.questMarksByPoi = new Map();

    this._dailyGrowthState = {};
    this._currentGrowthPoi = null;
  }

  init({ renderer, character, coordSys, mapData, eventBus, inputManager }) {
    this.renderer = renderer;
    this.character = character;
    this.coordSys = coordSys;
    this.mapData = mapData;
    this.eventBus = eventBus;
    this.inputManager = inputManager;

    this._ensureUI();
    this._bindEvents();
    this._restoreTracking();
    this.initialized = true;
    window.questMapIntegration = this;
  }

  _ensureUI() {
    if (!document.getElementById('quest-map-prompt')) {
      this.promptEl = document.createElement('div');
      this.promptEl.id = 'quest-map-prompt';
      this.promptEl.className = 'hw-toast hw-toast-info';
      this.promptEl.style.cssText = `
        position: fixed;
        bottom: 140px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9000;
        display: none;
        pointer-events: none;
      `;
      document.body.appendChild(this.promptEl);
    }
    if (!document.getElementById('quest-poi-panel')) {
      this.panelEl = document.createElement('div');
      this.panelEl.id = 'quest-poi-panel';
      this.panelEl.className = 'hw-panel quest-poi-panel';
      this.panelEl.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 92%;
        max-width: 520px;
        max-height: 80vh;
        overflow-y: auto;
        padding: 22px;
        color: #e5e7eb;
        z-index: 10000;
        display: none;
      `;
      document.body.appendChild(this.panelEl);
    }
  }

  _bindEvents() {
    this.eventBus?.on('location:select', ({ map_id }) => {
      if (map_id) this.openPoiPanel(map_id);
    });

    this.eventBus?.on('render:post', ({ ctx, coordSys: cs }) => {
      this._drawQuestMarksOnMap(ctx, cs);
    });

    document.addEventListener('click', (e) => {
      if (e.target.dataset?.poiPanelAction === 'close') this.closePoiPanel();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.panelOpen) this.closePoiPanel();
      if (e.key === 'j' || e.key === 'J') {
        if (window.questTriggerUI) window.questTriggerUI.toggleStatusBar();
      }
    });
  }

  _drawQuestMarksOnMap(ctx, cs) {
    if (!this.renderer) return;
    const marks = this._buildQuestMarks();
    if (!marks.length) return;

    for (const mark of marks) {
      const p = cs.worldToScreen(mark.x, mark.y);
      const r = mark.isTracked ? 20 : 14;
      const statusColor = mark.statusColor || mark.color;

      ctx.save();
      ctx.shadowColor = statusColor;
      ctx.shadowBlur = mark.isTracked ? 22 : 12;

      ctx.beginPath();
      ctx.arc(p.x, p.y - r - 5, r, 0, Math.PI * 2);
      ctx.fillStyle = statusColor;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = mark.isTracked ? 3 : 2;
      ctx.stroke();

      if (mark.isTracked) {
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(p.x, p.y - r - 5, r + 8, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(245, 197, 66, 0.7)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.fillStyle = '#fff';
      ctx.font = `bold ${mark.isTracked ? 14 : 12}px "Microsoft YaHei", Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(mark.icon, p.x, p.y - r - 5);

      if (mark.count > 1) {
        ctx.beginPath();
        ctx.arc(p.x + r - 4, p.y - r - 5 - r + 4, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#ff4757';
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Arial';
        ctx.fillText(String(mark.count), p.x + r - 4, p.y - r - 5 - r + 4);
      }

      ctx.restore();
    }
  }

  update() {
    if (!this.initialized) return;
    this._updateProximity();
    this._updateQuestMarks();
  }

  _updateProximity() {
    const pos = this.character.getPos();
    const allPois = this.mapData.getAllLocations?.() || this.mapData.locations || [];
    let best = null;
    let bestDist = Infinity;

    for (const poi of allPois) {
      const px = poi.x || poi.rawX || 0;
      const py = poi.y || poi.rawY || 0;
      const d = Math.hypot(pos.x - px, pos.y - py);
      if (d <= this.proximityRadius && d < bestDist) {
        bestDist = d;
        best = poi;
      }
    }

    this.nearbyPoi = best;

    if (best) {
      const prevPoi = this._currentGrowthPoi;
      this._currentGrowthPoi = best.map_id;
      if (prevPoi && prevPoi !== best.map_id) {
        this._cancelDailyGrowthTimer(prevPoi);
      }
      this._scheduleDailyGrowth(best);
    } else {
      if (this._currentGrowthPoi) {
        this._cancelDailyGrowthTimer(this._currentGrowthPoi);
      }
      this._currentGrowthPoi = null;
    }

    if (best) {
      const npcs = this._getNpcsAtPoi(best.map_id);
      const bindings = this._getActiveBindingsAtPoi(best.map_id);
      if (bindings.length > 0) {
        const main = bindings.find(b => b.questType === 'main');
        const side = bindings.find(b => b.questType === 'side');
        let text = '按 E 交互';
        if (main) text = `按 E ${this._getQuestActionLabel(main)}：${main.questName}`;
        else if (side) text = `按 E ${this._getQuestActionLabel(side)}：${side.questName}`;
        this._showPrompt(text);
      } else if (npcs.length > 0) {
        this._showPrompt(`按 E 与 ${npcs[0].name} 交谈`);
      } else {
        this._showPrompt(`按 E 查看：${best.name || best.map_name}`);
      }
    } else {
      this._hidePrompt();
    }

    const ePressed = this.inputManager.getKeys()['e'];
    if (ePressed && !this.lastEKey && this.nearbyPoi) {
      this._handleEKey(this.nearbyPoi);
    }
    this.lastEKey = ePressed;
  }

  _handleEKey(poi) {
    const bindings = this._getActiveBindingsAtPoi(poi.map_id);
    const npcs = this._getNpcsAtPoi(poi.map_id);
    if (bindings.length > 0) {
      const target = this.trackedBinding || bindings[0];
      this._triggerQuest(target);
    } else if (npcs.length > 0) {
      this._openNpcDialogue(npcs[0].npcId);
    } else {
      this.openPoiPanel(poi.map_id);
    }
  }

  _getNpcsAtPoi(poiId) {
    if (window.npcMapUI) return window.npcMapUI.getNpcsForPoi(poiId);
    return getNpcsByPoiId(poiId);
  }

  _getActiveBindingsAtPoi(poiId) {
    const qtm = window.questTriggerManager;
    if (!qtm) return questPoiBinder.getBindingsByPoiId(poiId);
    const all = questPoiBinder.getBindingsByPoiId(poiId);
    return all.filter(b => {
      const status = this._getQuestStatus(b);
      return status !== QUEST_STATUS.COMPLETED && status !== QUEST_STATUS.FAILED && status !== QUEST_STATUS.EXPIRED;
    });
  }

  _getQuestStatus(binding) {
    const qtm = window.questTriggerManager;
    if (!qtm) return QUEST_STATUS.LOCKED;
    return binding.questType === 'main'
      ? qtm.questStatus?.[binding.questId]
      : qtm.sideQuestStatus?.[binding.questId];
  }

  _getQuestActionLabel(binding) {
    const status = this._getQuestStatus(binding);
    if (status === QUEST_STATUS.AVAILABLE || status === QUEST_STATUS.PREREQ_MET) return '接取任务';
    if (status === QUEST_STATUS.ACTIVE) return '推进任务';
    if (status === QUEST_STATUS.READY_TO_COMPLETE) return '交付任务';
    return '查看任务';
  }

  _triggerQuest(binding) {
    const qtm = window.questTriggerManager;
    if (!qtm) return;
    try {
      const status = this._getQuestStatus(binding);
      let result = null;

      if (status === QUEST_STATUS.AVAILABLE || status === QUEST_STATUS.PREREQ_MET) {
        if (binding.questType === 'main') {
          result = qtm.acceptMainQuest?.(binding.questId);
        } else {
          result = qtm.acceptSideQuest?.(binding.questId);
        }
      } else if (status === QUEST_STATUS.ACTIVE) {
        result = qtm.reportQuestEvent?.({ type: 'complete_dialogue', questId: binding.questId });
      } else if (status === QUEST_STATUS.READY_TO_COMPLETE) {
        if (binding.questType === 'main') {
          result = qtm.completeQuest?.(binding.questId);
        } else {
          result = qtm.completeSideQuest?.(binding.questId);
        }
      }

      if (result?.success === false) {
        this._showToast(result.message || '任务操作失败', 'error');
      } else {
        this._showToast(`任务触发：${binding.questName}`, 'success');
      }
      this._saveTracking();
      this._updateQuestMarks();
      this._updatePoiPanel();
      if (window.npcMapUI) window.npcMapUI._refreshMarkers?.();
    } catch (e) {
      console.error('[QuestMapIntegration] 触发任务失败:', e);
      this._showToast(`无法触发：${e.message || '前置条件未满足'}`, 'error');
    }
  }

  openPoiPanel(poiId) {
    const poi = this.mapData.getLocationById?.(poiId) || this._findPoiById(poiId);
    if (!poi) return;

    const bindings = this._getActiveBindingsAtPoi(poiId);
    const allBindings = questPoiBinder.getBindingsByPoiId(poiId);
    const mainQuests = allBindings.filter(b => b.questType === 'main');
    const sideQuests = allBindings.filter(b => b.questType === 'side');
    const eventType = MapEventConfig.poiEventTypes[poi.type] || MapEventConfig.poiEventTypes[poi.map_type] || { label: '地点', canEnter: false };
    const moduleEntry = MapEventConfig.moduleEntries[poi.name];
    const npcs = this._getNpcsAtPoi(poiId);

    const typeLabel = this._escapeHTML(eventType.label || '地点');
    const description = this._escapeHTML(poi.description || eventType.description || '');

    let html = `
      <div class="poi-panel-header" style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;gap:12px;">
        <div style="min-width:0;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
            <span class="hw-tag" style="font-size:12px;padding:4px 10px;">${typeLabel}</span>
            ${poi.map_type ? `<span class="hw-tag" style="font-size:12px;padding:4px 10px;">${TYPES[poi.map_type]?.icon || ''} ${TYPES[poi.map_type]?.label || typeLabel}</span>` : ''}
          </div>
          <h2 style="margin:0;color:var(--hw-gold);font-size:20px;letter-spacing:1px;word-break:break-word;">${this._escapeHTML(poi.name || poi.map_name)}</h2>
          ${description ? `<p style="color:var(--hw-text-muted);font-size:13px;margin:8px 0 0 0;line-height:1.6;">${description}</p>` : ''}
        </div>
        <button data-poi-panel-action="close" class="hw-button hw-button-ghost hw-icon-button" style="width:32px;height:32px;font-size:18px;flex-shrink:0;">✕</button>
      </div>
    `;

    if (npcs.length > 0) {
      html += `<div class="poi-section" style="margin-bottom:16px;">`;
      html += `<div style="color:var(--hw-gold);font-weight:700;font-size:13px;margin-bottom:10px;">关联 NPC</div>`;
      html += `<div class="poi-npc-list">`;
      for (const npc of npcs) {
        html += this._renderNpcRow(npc);
      }
      html += `</div></div>`;
    } else {
      html += `<div class="poi-section" style="margin-bottom:16px;">`;
      html += `<div style="color:var(--hw-gold);font-weight:700;font-size:13px;margin-bottom:10px;">关联 NPC</div>`;
      html += `<div class="hw-card" style="color:var(--hw-text-muted);font-size:13px;">暂无 NPC</div>`;
      html += `</div>`;
    }

    if (mainQuests.length) {
      html += `<div class="poi-section" style="margin-bottom:16px;">`;
      html += `<div style="color:var(--hw-info);font-weight:700;font-size:13px;margin-bottom:10px;">主线任务</div>`;
      html += `<div class="poi-quest-list">`;
      for (const q of mainQuests) {
        html += this._renderQuestRow(q, 'main', bindings.some(b => b.questId === q.questId));
      }
      html += `</div></div>`;
    }

    if (sideQuests.length) {
      html += `<div class="poi-section" style="margin-bottom:16px;">`;
      html += `<div style="color:var(--hw-success);font-weight:700;font-size:13px;margin-bottom:10px;">🌟 支线任务</div>`;
      html += `<div class="poi-quest-list">`;
      for (const q of sideQuests) {
        html += this._renderQuestRow(q, 'side', bindings.some(b => b.questId === q.questId));
      }
      html += `</div></div>`;
    }

    if (!mainQuests.length && !sideQuests.length) {
      html += `<div class="poi-section" style="margin-bottom:16px;">`;
      html += `<div style="color:var(--hw-gold);font-weight:700;font-size:13px;margin-bottom:10px;">相关任务</div>`;
      html += `<div class="hw-card" style="color:var(--hw-text-muted);font-size:13px;">当前地点暂无关联任务</div>`;
      html += `</div>`;
    }

    const actionButtons = [];
    if (moduleEntry) {
      actionButtons.push(`<button class="hw-button hw-button-secondary poi-action-btn" data-action="module" data-module="${moduleEntry.type}">
          ${moduleEntry.label}
        </button>`);
    }
    if (eventType.canEnter) {
      actionButtons.push(`<button class="hw-button hw-button-secondary poi-action-btn" data-action="enter" data-scene="${eventType.scenes[0] || ''}">
          进入室内
        </button>`);
    }
    if (actionButtons.length) {
      html += `<div class="poi-section" style="margin-bottom:16px;">`;
      html += `<div style="color:var(--hw-accent-pink);font-weight:700;font-size:13px;margin-bottom:10px;">📦 可执行动作</div>`;
      html += `<div style="display:flex;gap:10px;flex-wrap:wrap;">${actionButtons.join('')}</div>`;
      html += `</div>`;
    }

    html += `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px;">`;
    html += `<button class="hw-button hw-button-primary poi-action-btn" data-action="track">追踪此地点</button>`;
    html += `<button class="hw-button hw-button-secondary poi-action-btn" data-action="go">前往目标</button>`;
    html += `</div>`;

    this.panelEl.innerHTML = html;
    this._bindPanelActions(poi, bindings, npcs);
    this.panelEl.style.display = 'block';
    this.panelOpen = true;
  }

  _renderNpcRow(npc) {
    const status = this._getNpcStatus(npc);
    const statusLabel = {
      HAS_QUEST: '可接任务',
      COMPLETABLE: '可交付',
      NORMAL: '可交谈'
    }[status] || '可交谈';
    const statusColor = {
      HAS_QUEST: '#4ade80',
      COMPLETABLE: '#fbbf24',
      NORMAL: '#9ca3af'
    }[status] || '#9ca3af';
    return `
      <div class="hw-card poi-npc-card" style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px;">
        <div style="min-width:0;">
          <div style="font-weight:600;font-size:14px;">${this._escapeHTML(npc.name)}</div>
          <div style="font-size:11px;color:${statusColor};margin-top:4px;">${this._escapeHTML(npc.title || npc.role || '')} · ${statusLabel}</div>
        </div>
        <button class="hw-button hw-button-secondary poi-action-btn" data-action="npc" data-npc-id="${npc.npcId}">交谈</button>
      </div>
    `;
  }

  _getNpcStatus(npc) {
    const qtm = window.questTriggerManager;
    if (!qtm || !npc.questIds?.length) return 'NORMAL';
    for (const qid of npc.questIds) {
      const status = qtm.questStatus?.[qid];
      if (status === QUEST_STATUS.ACTIVE) return 'COMPLETABLE';
      if (status !== QUEST_STATUS.COMPLETED && status !== QUEST_STATUS.FAILED) return 'HAS_QUEST';
    }
    return 'NORMAL';
  }

  _renderQuestRow(binding, kind, isActive) {
    const status = this._getQuestStatus(binding);
    const isAvailable = status === QUEST_STATUS.AVAILABLE || status === QUEST_STATUS.PREREQ_MET;
    const isActiveStatus = status === QUEST_STATUS.ACTIVE;
    const isReady = status === QUEST_STATUS.READY_TO_COMPLETE;
    const isCompleted = status === QUEST_STATUS.COMPLETED;
    const badgeClass = STATUS_BADGE_CLASS[status] || 'hw-tag';
    const statusLabel = STATUS_LABELS[status] || '未解锁';
    const statusColor = STATUS_COLORS[status] || '#64748b';
    const actionLabel = this._getQuestActionLabel(binding);
    const disabled = isCompleted ? 'disabled' : '';

    const qtm = window.questTriggerManager;
    let objective = '';
    if (isActiveStatus && qtm) {
      const progress = qtm._getObjectiveProgress?.(binding.questId);
      if (progress && typeof progress.current === 'number' && typeof progress.target === 'number') {
        objective = ` (${progress.current}/${progress.target})`;
      }
    }

    const tracked = qtm?.trackedQuestId === binding.questId;
    const trackButton = !isCompleted
      ? `<button class="hw-button hw-button-ghost poi-action-btn" data-action="track-quest" data-quest-id="${binding.questId}" data-quest-kind="${kind}" title="${tracked ? '取消追踪' : '追踪任务'}">
          ${tracked ? '🔔' : '🔕'}
        </button>`
      : '';

    return `
      <div class="hw-card poi-quest-card" style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px;">
        <div style="min-width:0;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span style="font-weight:600;font-size:14px;">${this._escapeHTML(binding.questName)}</span>
            <span class="${badgeClass}">${statusLabel}</span>
          </div>
          <div style="font-size:11px;color:${statusColor};margin-top:4px;">${this._escapeHTML(this._getQuestHint(binding, status))}${objective}</div>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0;">
          ${trackButton}
          <button class="hw-button hw-button-secondary poi-action-btn" data-action="trigger" data-quest-id="${binding.questId}" data-quest-kind="${kind}" ${disabled}>${actionLabel}</button>
        </div>
      </div>
    `;
  }

  _getQuestHint(binding, status) {
    const qtm = window.questTriggerManager;
    if (status === QUEST_STATUS.LOCKED || status === QUEST_STATUS.LOCATION_REACHED) {
      const prereq = qtm?.checkPrerequisitesDetailed?.(binding.questId);
      if (prereq && !prereq.met) return `前置：${prereq.missing.slice(0, 2).join('、') || '未知'}`;
      return '未到达任务地点';
    }
    if (status === QUEST_STATUS.AVAILABLE || status === QUEST_STATUS.PREREQ_MET) return '可接取任务';
    if (status === QUEST_STATUS.ACTIVE) return '进行中';
    if (status === QUEST_STATUS.READY_TO_COMPLETE) return '可交付';
    if (status === QUEST_STATUS.COMPLETED) return '已完成';
    return '';
  }

  _bindPanelActions(poi, bindings, npcs) {
    this.panelEl.querySelectorAll('.poi-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'trigger') {
          const id = btn.dataset.questId;
          const kind = btn.dataset.questKind;
          const b = bindings.find(x => x.questId === id && x.questType === kind);
          if (b) this._triggerQuest(b);
        } else if (action === 'track') {
          this.trackPoi(poi.map_id);
        } else if (action === 'track-quest') {
          const id = btn.dataset.questId;
          const kind = btn.dataset.questKind;
          this._trackQuestFromPanel(id, kind);
        } else if (action === 'go') {
          this.focusOnPoi(poi.map_id);
        } else if (action === 'enter') {
          const scene = btn.dataset.scene;
          if (scene) this.enterScene(scene);
        } else if (action === 'module') {
          const moduleType = btn.dataset.module;
          this._openModule(moduleType, poi);
        } else if (action === 'npc') {
          const npcId = btn.dataset.npcId;
          if (npcId) this._openNpcDialogue(npcId);
        }
      });
    });
  }

  _trackQuestFromPanel(questId, kind) {
    const qtm = window.questTriggerManager;
    if (!qtm) return;
    const isTracked = qtm.trackedQuestId === questId;
    if (isTracked) {
      qtm.setTrackedQuest?.(null);
      this._showToast('已取消追踪', 'info');
    } else {
      const result = qtm.setTrackedQuest?.(questId, kind);
      if (result?.success) {
        this.trackQuest(questId, kind);
      } else {
        this._showToast(result?.message || '追踪失败', 'error');
      }
    }
    this._saveTracking();
    this._updateHUD();
  }

  _openNpcDialogue(npcId) {
    if (window.npcMapUI) {
      window.npcMapUI.openNpc(npcId);
    } else {
      const npc = this._getNpcById?.(npcId);
      if (npc) this._showToast(`请与 ${npc.name} 对话（NPC 系统加载中）`, 'info');
    }
  }

  _getNpcById(npcId) {
    if (window.npcMapUI) return window.npcMapUI.getNpcsForPoi?.().find(n => n.npcId === npcId);
    return null;
  }

  _openModule(type, poi) {
    if (type === 'club') {
      this._triggerQuestById('club_join', 'side');
    } else if (type === 'running') {
      this._triggerQuestById('run_first', 'side');
    } else if (type === 'library') {
      this._triggerQuestById('self_study_library_1', 'main');
    } else if (type === 'canteen') {
      this._triggerQuestById('explore_canteen_secret', 'side');
    } else if (type === 'lab') {
      this._triggerQuestById('explore_lab', 'side');
    }
  }

  _triggerQuestById(questId, kind) {
    const binding = questPoiBinder.getBindingByQuestId(questId);
    if (binding) this._triggerQuest(binding);
  }

  closePoiPanel() {
    if (this.panelEl) this.panelEl.style.display = 'none';
    this.panelOpen = false;
  }

  trackPoi(poiId) {
    const poi = this._findPoiById(poiId);
    if (!poi) return;
    this.trackedPoi = poi;
    const bindings = this._getActiveBindingsAtPoi(poiId);
    this.trackedBinding = bindings[0] || null;
    this._saveTracking();
    this._showToast(`已追踪：${poi.name || poi.map_name}`, 'info');
    this.focusOnPoi(poiId);
    this._updateHUD();
  }

  focusOnPoi(poiId) {
    const poi = this._findPoiById(poiId);
    if (!poi || !this.coordSys) return;
    this.coordSys.centerOn?.(poi.x, poi.y, this.renderer.staticCanvas.width, this.renderer.staticCanvas.height);
    this.renderer.markDirty?.();
  }

  trackQuest(questId, kind = 'main') {
    const binding = questPoiBinder.getBindingByQuestId(questId);
    if (!binding || !binding.poiId) {
      this._showToast('该任务地点待配置', 'error');
      return;
    }
    this.trackedBinding = binding;
    this.trackedPoi = this._findPoiById(binding.poiId);
    this._saveTracking();
    this._showToast(`已追踪任务：${binding.questName}`, 'info');
    this.focusOnPoi(binding.poiId);
    this._updateHUD();
  }

  enterScene(sceneId) {
    if (window.mapSceneManager) {
      window.mapSceneManager.enterScene(sceneId);
      this._updateHUD();
    }
  }

  _saveTracking() {
    const qm = this._getSaveManager?.();
    if (qm) {
      qm.setProgressField?.('trackedQuestId', this.trackedBinding?.questId || null);
      qm.setProgressField?.('trackedQuestKind', this.trackedBinding?.questType || null);
      qm.setProgressField?.('trackedQuestGroup', this.trackedBinding?.group || null);
      qm.setProgressField?.('trackedPoiId', this.trackedPoi?.map_id || null);
    }
    const qtm = window.questTriggerManager;
    if (qtm && this.trackedBinding?.questId) {
      qtm.trackedQuestId = this.trackedBinding.questId;
      qtm.trackedQuestKind = this.trackedBinding.questType || null;
    }
  }

  _restoreTracking() {
    const qm = this._getSaveManager?.();
    if (!qm) return;
    const progress = qm.getProgress?.() || {};
    const trackedPoiId = progress.trackedPoiId;
    if (trackedPoiId) {
      this.trackedPoi = this._findPoiById(trackedPoiId);
    }
    const trackedQuestId = progress.trackedQuestId;
    if (trackedQuestId) {
      this.trackedBinding = questPoiBinder.getBindingByQuestId(trackedQuestId);
    }
    const qtm = window.questTriggerManager;
    if (qtm && trackedQuestId) {
      qtm.trackedQuestId = trackedQuestId;
      qtm.trackedQuestKind = progress.trackedQuestKind || null;
    }
  }

  _getSaveManager() {
    return window.saveManager || (window.gameSystem?.saveManager);
  }

  _findPoiById(id) {
    if (this.mapData.getLocationById) return this.mapData.getLocationById(id);
    return (this.mapData.locations || []).find(p => p.map_id === id) || null;
  }

  _scheduleDailyGrowth(poi) {
    const mapId = poi.map_id;
    if (!mapId) return;
    if (!this._dailyGrowthState[mapId]) {
      this._dailyGrowthState[mapId] = { lastTriggered: 0, timer: null };
    }
    const state = this._dailyGrowthState[mapId];
    if (state.timer) return;
    const cooldown = 60000;
    if (Date.now() - state.lastTriggered < cooldown) return;
    state.timer = setTimeout(() => {
      state.timer = null;
      state.lastTriggered = Date.now();
      this._triggerDailyGrowth(poi);
    }, 3000);
  }

  _cancelDailyGrowthTimer(mapId) {
    const state = this._dailyGrowthState[mapId];
    if (state && state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
  }

  _triggerDailyGrowth(poi) {
    const qm = window.questTriggerManager;
    if (!qm) return;
    const type = poi.type || poi.map_type;
    const name = poi.name || poi.map_name;
    let changes = null;
    let message = '';
    if (type === 'landmark' && name === '主图书馆') {
      qm.visitLibrary?.();
      const subject = this._pickStudySubject(qm);
      qm.addProficiency(subject, 10, 'daily_library');
      changes = { knowledge: 5, mood: 2 };
      message = '在图书馆自习：知识+5 心情+2 熟练度+10';
    } else if (type === 'playground') {
      qm.sideQuestProgress.runs += 1;
      qm.sideQuestProgress.runStreak += 1;
      changes = { stamina: 2 };
      message = '在操场跑步：体能+2 跑步次数+1';
    } else if (type === 'canteen') {
      qm.sideQuestProgress.canteenVisits += 1;
      changes = { stamina: 10, mood: 5, money: -5 };
      message = '在食堂用餐：体能+10 心情+5 金币-5';
    } else if (name === '引力实验室') {
      qm.visitLab?.(name);
      changes = { knowledge: 5 };
      message = '参观实验室：知识+5';
    }
    if (changes) {
      qm.applyStatChanges(changes, `daily_${type || 'location'}`);
      qm.saveProgress?.();
      this._showToast(message, 'success');
    }
  }

  _pickStudySubject(qm) {
    const unlocked = Array.from(qm.unlockedSubjects || []);
    if (unlocked.length) return unlocked[0];
    const subjects = Object.keys(qm.proficiencies || {});
    if (subjects.length) return subjects[0];
    return '专业必修课1';
  }

  _showPrompt(text) {
    if (!this.promptEl) return;
    this.promptEl.textContent = text;
    this.promptEl.style.display = 'block';
  }

  _hidePrompt() {
    if (!this.promptEl) return;
    this.promptEl.style.display = 'none';
  }

  _showToast(message, type = 'info') {
    if (typeof window !== 'undefined' && window.UIFeedback) {
      window.UIFeedback.showToast(message, type);
      return;
    }
    const color = type === 'success' ? '#00C9A7' : type === 'error' ? '#F87171' : '#F5C542';
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 90px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15,23,42,0.96);
      color: ${color};
      border: 1px solid ${color};
      border-radius: 8px;
      padding: 10px 18px;
      z-index: 11000;
      font-weight: 600;
      box-shadow: 0 18px 50px rgba(0,0,0,0.48);
      max-width: min(480px, 92vw);
      font-size: 13px;
      pointer-events: none;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  _updateQuestMarks() {
    if (!this.renderer || !this.mapData) return;
    this.renderer.questMarks = this._buildQuestMarks();
  }

  _buildQuestMarks() {
    const qtm = window.questTriggerManager;
    if (!qtm) return [];

    const marks = [];
    const groupedByPoi = new Map();
    const allBindings = questPoiBinder.getBindings();

    for (const b of allBindings) {
      const status = this._getQuestStatus(b);
      if (status === QUEST_STATUS.COMPLETED || status === QUEST_STATUS.FAILED || status === QUEST_STATUS.EXPIRED) continue;
      if (!b.poiId || !b.x || !b.y) continue;
      if (!groupedByPoi.has(b.poiId)) groupedByPoi.set(b.poiId, []);
      groupedByPoi.get(b.poiId).push(b);
    }

    for (const [poiId, bindings] of groupedByPoi) {
      const poi = this._findPoiById(poiId);
      const x = poi?.x || bindings[0].x;
      const y = poi?.y || bindings[0].y;
      const hasMain = bindings.some(b => b.questType === 'main');
      const hasClub = bindings.some(b => b.group === 'club');
      const hasRunning = bindings.some(b => b.group === 'running');
      const hasExploration = bindings.some(b => b.group === 'exploration');
      const isTracked = this.trackedPoi?.map_id === poiId || (this.trackedBinding && this.trackedBinding.poiId === poiId);

      const statusPriority = bindings.map(b => this._getQuestStatus(b)).sort((a, b) => {
        const order = { [QUEST_STATUS.READY_TO_COMPLETE]: 0, [QUEST_STATUS.ACTIVE]: 1, [QUEST_STATUS.AVAILABLE]: 2, [QUEST_STATUS.PREREQ_MET]: 3, [QUEST_STATUS.LOCKED]: 4, [QUEST_STATUS.LOCATION_REACHED]: 5 };
        return (order[a] ?? 99) - (order[b] ?? 99);
      });
      const dominantStatus = statusPriority[0] || QUEST_STATUS.LOCKED;
      const statusColor = STATUS_COLORS[dominantStatus] || '#4ade80';

      let icon = '★';
      if (hasMain) { icon = 'M'; }
      else if (hasClub) { icon = 'C'; }
      else if (hasRunning) { icon = 'R'; }
      else if (hasExploration) { icon = 'E'; }

      marks.push({ x, y, color: statusColor, statusColor, icon, count: bindings.length, poiId, isTracked, status: dominantStatus });
    }
    return marks;
  }

  exportPoiBindings() {
    return questPoiBinder.exportReport();
  }

  _updatePoiPanel() {
    if (this.panelOpen && this.nearbyPoi) {
      this.openPoiPanel(this.nearbyPoi.map_id);
    }
  }

  _updateHUD() {
    if (window._uiManager) window._uiManager._updateHUD();
  }

  _autoInit() {
    const tryInit = () => {
      if (window._mapSystemReady && window._mapData && window._renderer && window._character && window._coordSys && window._eventBus && window._inputManager) {
        if (this.initialized) return;
        this.init({
          renderer: window._renderer,
          character: window._character,
          coordSys: window._coordSys,
          mapData: window._mapData,
          eventBus: window._eventBus,
          inputManager: window._inputManager
        });
      }
    };

    if (typeof window !== 'undefined') {
      if (window._mapSystemReady) tryInit();
      window.addEventListener('mapsystem:ready', tryInit);
      setTimeout(tryInit, 500);
      setTimeout(tryInit, 1500);
    }
  }

  _escapeHTML(value) {
    return String(value ?? '').replace(/[\u0026\u003c\u003e"']/g, ch => ({
      '\u0026': '\u0026amp;',
      '\u003c': '\u0026lt;',
      '\u003e': '\u0026gt;',
      '"': '\u0026quot;',
      "'": '\u0026#39;'
    }[ch]));
  }
}

export const questMapIntegration = new QuestMapIntegration();
if (typeof window !== 'undefined') questMapIntegration._autoInit();
export default questMapIntegration;
