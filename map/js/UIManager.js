import { EventBus } from './EventBus.js';
import { coordSys } from './CoordSys.js';
import { mapData } from './MapData.js';
import { character } from './Character.js';
import { busTravel } from './BusTravel.js';
import { TYPES } from './config.js';

const UI_LABELS = {
  available: '可接',
  active: '进行中',
  ready: '可交付',
  completed: '已完成',
  locked: '未解锁'
};

const UI_COLORS = {
  available: '#4ade80',
  active: '#60a5fa',
  ready: '#fbbf24',
  completed: '#9ca3af',
  locked: '#64748b'
};

class UIManager {
  constructor() {
    this.filterType = 'all';
    this.selectedId = null;
    this.inited = false;
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

  _safeText(value) {
    if (value === undefined || value === null || value === '') return null;
    return String(value);
  }

  _formatEmpty(value, fallback) {
    const t = this._safeText(value);
    return t || fallback;
  }

  _getCharacter() {
    return {
      name: localStorage.getItem('character_name') || '玩家',
      gender: character.getGender?.() || 'male',
      college: window.saveManager?.getProgressField?.('college') || 'HUST 学员',
      level: window.questTriggerManager?.characterStats?.level || 1
    };
  }

  _getQuestManager() {
    return window.questTriggerManager || null;
  }

  _getCurrentSceneName() {
    const sceneId = window.mapSceneManager?.currentSceneId || 'campus';
    if (sceneId === 'campus') return '室外校园';
    const names = {
      library_inside: '图书馆室内',
      dorm_inside: '宿舍室内',
      classroom_inside: '教学楼室内',
      club_center_inside: '社团活动中心',
      lab_inside: '实验室',
      canteen_inside: '食堂'
    };
    return names[sceneId] || '室内场景';
  }

  _getTrackedQuestSummary() {
    const qm = this._getQuestManager();
    if (!qm || !qm.trackedQuestId) return null;
    const tracked = qm.getTrackedQuest?.();
    if (!tracked) return null;
    const status = tracked.status || 'LOCKED';
    return {
      name: tracked.name || tracked.title || tracked.questName || '追踪任务',
      status: status,
      statusText: UI_LABELS[status.toLowerCase()] || '任务',
      statusColor: UI_COLORS[status.toLowerCase()] || '#94a3b8'
    };
  }

  init() {
    if (this.inited) return;
    this.inited = true;

    this._initSidePanel();
    this._initBusPanel();
    this._initMiniToolbar();
    this._initHUD();

    EventBus.on('data:loaded', () => {
      this._buildTypeTags();
      this._buildLegend();
      this._buildLocList();
    });

    EventBus.on('location:select', ({ map_id }) => {
      this.selectedId = map_id;
      this._updateSelInfo();
      this._updateLocListSelection();
      const loc = mapData.getLocationById(map_id);
      const title = map_id != null ? `${TYPES[loc?.map_type]?.icon || ''} ${loc?.map_name || '未命名地点'}` : '点击地图选择位置';
      const el = document.getElementById('selTitle');
      if (el) el.textContent = title;
    });

    EventBus.on('character:move', () => this._updateHUD());
    EventBus.on('character:teleport', () => this._updateHUD());

    EventBus.on('bus:panel:show', ({ stop }) => this._showBusPanel(stop));
    EventBus.on('bus:panel:hide', () => this._hideBusPanel());
  }

  _initSidePanel() {
    const toggleBtn = document.getElementById('panelToggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const panel = document.getElementById('sidePanel');
        panel.classList.toggle('open');
        toggleBtn.classList.toggle('active', panel.classList.contains('open'));
      });
    }
  }

  _buildTypeTags() {
    const types = [{ k: 'all', l: '全部' }];
    Object.entries(TYPES).forEach(([k, v]) => types.push({ k, l: v.label }));
    const el = document.getElementById('typeTags');
    if (!el) return;
    el.innerHTML = types.map(t =>
      `<span class="type-tag${this.filterType === t.k ? ' active' : ''}" data-type="${t.k}">${this._escapeHTML(t.l)}</span>`
    ).join('');

    el.querySelectorAll('.type-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        el.querySelectorAll('.type-tag').forEach(t => t.classList.remove('active'));
        tag.classList.add('active');
        this.filterType = tag.dataset.type;
        this._buildLocList();
      });
    });
  }

  _buildLegend() {
    const legendEl = document.getElementById('legend');
    if (legendEl) legendEl.innerHTML = Object.entries(TYPES).map(([k, v]) =>
      `<span><i style="background:${this._escapeHTML(v.color)}"></i>${this._escapeHTML(v.label)}</span>`
    ).join('');
  }

  _buildLocList() {
    const listEl = document.getElementById('locList');
    if (!listEl) return;
    const locs = this.filterType === 'all'
      ? mapData.getAllLocations()
      : mapData.getLocationsByType(this.filterType);

    listEl.innerHTML = locs.map(l => {
      const c = TYPES[l.map_type];
      const name = this._escapeHTML(l.map_name);
      const label = this._escapeHTML(c?.label || '');
      return `<div class="loc-item${this.selectedId === l.map_id ? ' sel' : ''}" data-id="${l.map_id}">
        <span class="loc-dot" style="background:${this._escapeHTML(c?.color || '#999')}"></span>
        <span class="loc-name">${name}</span>
        <span class="loc-type">${label}</span>
      </div>`;
    }).join('');

    listEl.querySelectorAll('.loc-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = parseInt(el.dataset.id);
        EventBus.emit('location:select', { map_id: id });
      });
    });
  }

  _updateLocListSelection() {
    document.querySelectorAll('#locList .loc-item').forEach(el => {
      el.classList.toggle('sel', parseInt(el.dataset.id) === this.selectedId);
    });
  }

  _updateSelInfo() {
    const el = document.getElementById('selInfo');
    if (this.selectedId == null) {
      if (el) el.innerHTML = '点击地图标记查看详情';
      return;
    }
    const loc = mapData.getLocationById(this.selectedId);
    const cfg = TYPES[loc?.map_type];
    if (el) {
      el.innerHTML = loc
        ? `<b>类型:</b> ${this._escapeHTML(cfg?.label || '-')}<br><b>坐标:</b> (${loc.x.toFixed(0)}, ${loc.y.toFixed(0)})<br><b>描述:</b> ${this._escapeHTML(loc.description || '无')}`
        : '点击地图标记查看详情';
    }
  }

  _initHUD() {
    this._ensureHUD();
    this._updateHUD();
  }

  _ensureHUD() {
    const hud = document.getElementById('hud');
    if (!hud) return;
    hud.innerHTML = `
      <div class="hud-title" id="hudTitle">状态概览</div>
      <div class="hud-row" id="hudCharacter">
        <span class="hud-label">角色</span>
        <span class="hud-val" id="hudName">-</span>
      </div>
      <div class="hud-row hud-mobile-hide" id="hudCollegeRow">
        <span class="hud-label">学院</span>
        <span class="hud-val" id="hudCollege">-</span>
      </div>
      <div class="hud-row">
        <span class="hud-label">地点</span>
        <span class="hud-val" id="hudNear">-</span>
      </div>
      <div class="hud-row hud-mobile-hide">
        <span class="hud-label">场景</span>
        <span class="hud-val" id="hudScene">室外校园</span>
      </div>
      <div class="hud-row" id="hudQuestRow">
        <span class="hud-label">追踪</span>
        <span class="hud-val" id="hudQuest" style="display:flex;align-items:center;gap:6px;">-</span>
      </div>
      <div class="hud-row hud-mobile-hide">
        <span class="hud-label">坐标</span>
        <span class="hud-val" id="hudXY">(0, 0)</span>
      </div>
      <div class="hud-actions" id="hudActions">
        <button class="hw-button hw-button-secondary" id="hudBack" title="返回游戏主界面">首页</button>
        <button class="hw-button hw-button-secondary" id="hudQuestLog" title="打开任务日志">任务</button>
        <button class="hw-button hw-button-secondary" id="hudReset" title="重置视角">重置</button>
        <button class="hw-button hw-button-secondary" id="hudTrack" title="定位当前追踪任务">定位</button>
        <button class="hw-button hw-button-secondary" id="hudReturn" title="返回室外地图" style="display:none;">返回</button>
      </div>
    `;

    const bind = (id, handler) => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', handler);
    };

    bind('hudBack', () => {
      if (window.location.pathname !== '/game/index.html') {
        window.location.href = '/game/index.html';
      }
    });
    bind('hudQuestLog', () => {
      if (window.questTriggerUI) window.questTriggerUI.toggleStatusBar();
    });
    bind('hudReset', () => EventBus.emit('ui:reset'));
    bind('hudTrack', () => {
      const qm = this._getQuestManager();
      if (qm && qm.trackedQuestId) {
        const binding = window.questPoiBinder?.getBindingByQuestId?.(qm.trackedQuestId);
        if (binding && window.questMapIntegration) {
          window.questMapIntegration.trackQuest?.(qm.trackedQuestId, qm.trackedQuestKind || 'main');
        } else {
          this._showToast('当前追踪任务缺少地点绑定', 'warning');
        }
      } else {
        this._showToast('没有追踪中的任务', 'info');
      }
    });
    bind('hudReturn', () => {
      if (window.mapSceneManager) window.mapSceneManager.returnToCampus();
    });
  }

  _updateHUD() {
    const ch = character.getPos();
    const nearest = mapData.getNearestLocation(ch.x, ch.y);

    const hudXY = document.getElementById('hudXY');
    const hudNear = document.getElementById('hudNear');
    if (hudXY) hudXY.textContent = `(${Math.round(ch.x)}, ${Math.round(ch.y)})`;
    if (hudNear) hudNear.textContent = nearest ? nearest.map_name : '-';

    const char = this._getCharacter();
    const hudName = document.getElementById('hudName');
    const hudCollege = document.getElementById('hudCollege');
    if (hudName) hudName.textContent = `${char.name} Lv.${char.level}`;
    if (hudCollege) hudCollege.textContent = char.college;

    const hudScene = document.getElementById('hudScene');
    if (hudScene) hudScene.textContent = this._getCurrentSceneName();

    const hudQuest = document.getElementById('hudQuest');
    const tracked = this._getTrackedQuestSummary();
    if (hudQuest) {
      if (tracked) {
        hudQuest.innerHTML = `<span style="color:${tracked.statusColor};font-size:10px;padding:2px 6px;border:1px solid ${tracked.statusColor};border-radius:999px;">${tracked.statusText}</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px;">${this._escapeHTML(tracked.name)}</span>`;
      } else {
        hudQuest.textContent = '无';
      }
    }

    const isIndoor = (window.mapSceneManager?.currentSceneId || 'campus') !== 'campus';
    const returnBtn = document.getElementById('hudReturn');
    if (returnBtn) returnBtn.style.display = isIndoor ? 'inline-flex' : 'none';
  }

  _showToast(message, type = 'info') {
    if (typeof window !== 'undefined' && window.UIFeedback) {
      window.UIFeedback.showToast(message, type);
    }
  }

  _initMiniToolbar() {
    const zoomInBtn = document.getElementById('btnZoomIn');
    if (zoomInBtn) zoomInBtn.addEventListener('click', () => coordSys.zoomIn());
    const zoomOutBtn = document.getElementById('btnZoomOut');
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => coordSys.zoomOut());
    const collisionBtn = document.getElementById('btnCollision');
    if (collisionBtn) collisionBtn.addEventListener('click', function () {
      this.classList.toggle('on');
      EventBus.emit('ui:collision:toggle', this.classList.contains('on'));
    });

    const labelsBtn = document.getElementById('btnLabels') || document.getElementById('btnShowLabels');
    if (labelsBtn) labelsBtn.addEventListener('click', function () {
      this.classList.toggle('on');
      EventBus.emit('ui:labels:toggle', this.classList.contains('on'));
    });
    const resetBtn = document.getElementById('btnReset') || document.getElementById('btnResetView');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      EventBus.emit('ui:reset');
    });
  }

  _initBusPanel() {
    const busOverlay = document.getElementById('busOverlay');
    if (busOverlay) {
      busOverlay.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) busTravel.hidePanel();
      });
    }
  }

  _showBusPanel(stop) {
    const routes = busTravel.getRoutesForStop(stop.map_id);
    const allStops = {};
    for (const loc of mapData.getLocationsByType('bus_stop')) {
      allStops[loc.map_id] = loc;
    }

    let html = `<button class="bus-panel-close" id="busCloseBtn">×</button>`;
    html += `<h2>${this._escapeHTML(stop.map_name)}</h2>`;
    html += `<p class="subtitle">选择要前往的巴士站</p>`;

    for (const route of routes) {
      html += `<div class="bus-route-card">`;
      html += `<div class="route-header"><span class="route-name">${this._escapeHTML(route.name)}</span><span class="route-price">¥${this._escapeHTML(route.price)}</span></div>`;
      html += `<div class="bus-route-stops">`;
      const seen = new Set();
      for (let i = 0; i < route.stops.length; i++) {
        const sid = route.stops[i];
        if (seen.has(sid)) continue;
        seen.add(sid);
        const s = allStops[sid];
        if (!s) continue;
        const isCurrent = sid === stop.map_id;
        if (i > 0) html += `<span class="bus-stop-arrow">→</span>`;
        html += `<button class="bus-stop-btn${isCurrent ? ' current' : ''}"
          ${isCurrent ? 'disabled' : `data-dest="${sid}"`}>${this._escapeHTML(s.map_name)}</button>`;
      }
      html += `</div></div>`;
    }

    const busPanel = document.getElementById('busPanel');
    if (busPanel) busPanel.innerHTML = html;
    const busOverlay = document.getElementById('busOverlay');
    if (busOverlay) busOverlay.classList.add('show');

    const closeBtn = document.getElementById('busCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', () => busTravel.hidePanel());
    document.querySelectorAll('.bus-stop-btn[data-dest]').forEach(btn => {
      btn.addEventListener('click', () => busTravel.takeBus(parseInt(btn.dataset.dest)));
    });
  }

  _hideBusPanel() {
    const busOverlay = document.getElementById('busOverlay');
    if (busOverlay) busOverlay.classList.remove('show');
  }
}

export const uiManager = new UIManager();
