/**
 * 地图增强功能：地点搜索、小地图、校园探索打卡、POI 详情面板、拍照打卡、首次到达成就、季节色调
 *
 * 通过 EventBus 接入核心地图系统，便于作为地图模块的扩展成果展示。
 * 新增功能：
 *   - 地点搜索 / 小地图 / 探索打卡（原有）
 *   - POI 详情面板：点击地图 POI 展示名称、类型、描述与拍照打卡按钮
 *   - 拍照打卡：维护独立的 visitedPhotoIds 集合，持久化到 localStorage；
 *               首次拍照解锁 first_poi_visit，累计 5 个不同 POI 解锁 photo_pioneer
 *   - 季节色调：根据真实月份（3-4 月樱花、10-11 月银杏）在 canvas 上叠加半透明色调
 *   - 可访问性：详情面板 role="dialog" aria-modal="true"，按钮带 type="button"
 *   - 性能优化 5.1e：_updateCheckinState 仅在数据变化时重绘 DOM，避免每帧重写 innerHTML
 *   - 可访问性 5.2b：监听 prefers-reduced-motion，开启时跳过飘落粒子与 Toast 进入动画
 */

import { EventBus } from '../EventBus.js';
import { mapData } from '../MapData.js';
import { coordSys } from '../CoordSys.js';
import { character } from '../Character.js';
import { TYPES, MAP } from '../config.js';

const CHECKIN_RADIUS = 90;
const CHECKIN_TYPES = new Set(['landmark', 'playground']);
const STORAGE_KEY = 'hust_world_exploration_checkins';
const PHOTO_STORAGE_KEY = 'hust_world_photo_checkins';
const ACHIEVEMENT_STORAGE_KEY = 'hust_world_achievements';
const PHOTO_PIONEER_TARGET = 5;
const DEFAULT_DESCRIPTION = '森林大学的标志性地点，等待你去探索。';

class MapEnhancements {
  constructor() {
    this.searchInput = null;
    this.searchResults = null;
    this.minimapCanvas = null;
    this.minimapCtx = null;
    this.checkinPanel = null;
    this.checkinButton = null;
    this.checkinListButton = null;
    this.checkinOverlay = null;
    this.checkinListBody = null;
    this.checkinListStats = null;
    this.progressText = null;
    this.currentTarget = null;
    this.selectedId = null;
    this.searchFocus = null;
    this.checkedIds = new Set(this._loadCheckedIds());
    this.visitedPhotoIds = new Set(this._loadPhotoIds());
    this.detailPanel = null;
    this.detailPanelBody = null;
    this.detailOverlay = null;
    this.photoBtn = null;
    this.detailCloseBtn = null;
    this._currentDetailLoc = null;
    this._reducedMotion = false;

    // 性能优化 5.1e：缓存上一次打卡 UI 状态，避免每帧重写 DOM
    this._lastCheckinTargetId = null;
    this._lastCheckinButtonText = null;
    this._lastProgressText = null;
    this._lastCheckinListHtml = null;
    this._lastCheckinStatsText = null;
  }

  init() {
    this._detectReducedMotion();
    this._bindReducedMotionListener();
    this._buildSearchUI();
    this._buildMinimapUI();
    this._buildCheckinUI();
    this._buildDetailPanel();
    this._applySeason();
    this._bindEvents();
    if (mapData.loaded) {
      this._renderSearchResults('');
      this._updateCheckinState();
      this._drawMinimap();
    }
  }

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

  _bindEvents() {
    EventBus.on('data:loaded', () => {
      this._renderSearchResults('');
      this._updateCheckinState();
      this._drawMinimap();
    });

    EventBus.on('character:move', () => {
      this._updateCheckinState();
      this._drawMinimap();
    });

    EventBus.on('viewport:change', () => this._drawMinimap());
    EventBus.on('location:select', ({ map_id }) => {
      this.selectedId = map_id;
      this._drawMinimap();
      this._openDetailPanel(map_id);
    });

    EventBus.on('input:key', ({ key, type }) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;
      if (type === 'down' && key === 'f') this._tryCheckin();
      if (type === 'down' && (key === 'p' || key === 'P')) this._takePhotoOfSelected();
    });

    EventBus.on('render:post', ({ ctx, coordSys }) => {
      this._drawCheckinMarkers(ctx, coordSys);
      this._drawSearchFocus(ctx, coordSys);
      this._drawSeasonTint(ctx);
    });

    window.addEventListener('resize', () => this._drawMinimap());
  }

  _buildSearchUI() {
    const sidePanel = document.getElementById('sidePanel');
    if (!sidePanel) return;
    const typeTitle = Array.from(sidePanel.querySelectorAll('h3'))
      .find(el => el.textContent.includes('地图筛选'));

    // 如果已有搜索框（融合系统可能预置），则不再创建
    if (document.getElementById('mapSearchInput')) return;

    const box = document.createElement('div');
    box.className = 'map-search';
    box.innerHTML = `
      <label for="mapSearchInput">地点搜索</label>
      <div class="map-search-row">
        <input id="mapSearchInput" type="search" autocomplete="off" placeholder="搜索东九、图书馆、韵苑...">
        <button id="mapSearchClear" title="清空搜索" type="button">×</button>
      </div>
      <div class="map-search-results" id="mapSearchResults"></div>
    `;
    if (typeTitle) {
      sidePanel.insertBefore(box, typeTitle);
    } else {
      sidePanel.appendChild(box);
    }

    this.searchInput = document.getElementById('mapSearchInput');
    this.searchResults = document.getElementById('mapSearchResults');

    this.searchInput.addEventListener('input', () => {
      this._renderSearchResults(this.searchInput.value);
    });

    document.getElementById('mapSearchClear').addEventListener('click', () => {
      this.searchInput.value = '';
      this._renderSearchResults('');
      this.searchInput.focus();
    });

    this.searchResults.addEventListener('click', (event) => {
      const action = event.target.closest('[data-search-action]');
      const item = event.target.closest('[data-loc-id]');
      if (!item) return;
      const locId = Number(item.dataset.locId);
      if (action?.dataset.searchAction === 'walk') {
        this._walkToLocation(locId);
        return;
      }
      this._focusLocation(locId);
    });
  }

  _buildMinimapUI() {
    const panel = document.createElement('div');
    panel.className = 'minimap';
    panel.id = 'minimapPanel';
    panel.setAttribute('role', 'complementary');
    panel.setAttribute('aria-label', '校园小地图');
    panel.innerHTML = `
      <div class="minimap-head">
        <span>校园小地图</span>
        <span class="minimap-meta">
          <strong id="minimapScale">1.00×</strong>
          <button class="minimap-toggle" id="minimapToggle" type="button" title="收起小地图" aria-expanded="true">−</button>
        </span>
      </div>
      <canvas id="minimapCanvas" width="500" height="252" aria-label="点击小地图移动视野"></canvas>
    `;
    document.body.appendChild(panel);
    this.minimapCanvas = document.getElementById('minimapCanvas');
    this.minimapCtx = this.minimapCanvas.getContext('2d');

    const toggle = document.getElementById('minimapToggle');
    toggle?.addEventListener('click', () => {
      const collapsed = panel.classList.toggle('is-collapsed');
      toggle.textContent = collapsed ? '+' : '−';
      toggle.title = collapsed ? '展开小地图' : '收起小地图';
      toggle.setAttribute('aria-expanded', String(!collapsed));
      if (!collapsed) this._drawMinimap();
    });

    this.minimapCanvas.addEventListener('click', (event) => {
      const rect = this.minimapCanvas.getBoundingClientRect();
      const wx = ((event.clientX - rect.left) / rect.width) * MAP.width;
      const wy = ((event.clientY - rect.top) / rect.height) * MAP.height;
      coordSys.centerOn(wx, wy, window.innerWidth, window.innerHeight);
    });
  }

  _buildCheckinUI() {
    const panel = document.createElement('div');
    panel.className = 'checkin-panel';
    panel.innerHTML = `
      <button class="checkin-summary" id="checkinListButton" type="button" title="查看探索列表">
        <span class="checkin-kicker">校园探索</span>
        <strong id="checkinProgress">0 / 0</strong>
        <small>查看列表</small>
      </button>
      <button id="checkinButton" disabled type="button">靠近地标打卡</button>
    `;
    document.body.appendChild(panel);
    this.checkinPanel = panel;
    this.checkinButton = document.getElementById('checkinButton');
    this.checkinListButton = document.getElementById('checkinListButton');
    this.progressText = document.getElementById('checkinProgress');
    this.checkinButton.addEventListener('click', () => this._tryCheckin());
    this.checkinListButton.addEventListener('click', () => this._openCheckinList());

    const overlay = document.createElement('div');
    overlay.className = 'checkin-overlay';
    overlay.id = 'checkinOverlay';
    overlay.innerHTML = `
      <div class="checkin-modal" role="dialog" aria-modal="true" aria-labelledby="checkinListTitle">
        <button class="checkin-modal-close" id="checkinListClose" type="button" aria-label="关闭">×</button>
        <div class="checkin-modal-head">
          <span class="checkin-kicker">校园探索</span>
          <h2 id="checkinListTitle">打卡列表</h2>
          <p id="checkinListStats">0 / 0 已完成</p>
        </div>
        <div class="checkin-list" id="checkinListBody"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    this.checkinOverlay = overlay;
    this.checkinListBody = document.getElementById('checkinListBody');
    this.checkinListStats = document.getElementById('checkinListStats');

    document.getElementById('checkinListClose').addEventListener('click', () => this._closeCheckinList());
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) this._closeCheckinList();
    });
    this.checkinListBody.addEventListener('click', (event) => {
      const item = event.target.closest('[data-checkin-loc-id]');
      if (!item) return;
      this._focusLocation(Number(item.dataset.checkinLocId));
      this._closeCheckinList();
    });
  }

  /**
   * 构建 POI 详情面板 DOM，支持 role="dialog" aria-modal 可访问性属性。
   */
  _buildDetailPanel() {
    if (document.getElementById('poi-detail-panel')) return;

    const overlay = document.createElement('div');
    overlay.className = 'poi-detail-overlay';
    overlay.id = 'poiDetailOverlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <div class="poi-detail-panel" id="poi-detail-panel" role="dialog" aria-modal="true" aria-labelledby="poi-detail-title">
        <div class="poi-detail-head">
          <div class="poi-detail-meta">
            <span class="poi-detail-type" id="poi-detail-type"></span>
            <h2 class="poi-detail-title" id="poi-detail-title"></h2>
          </div>
          <button class="poi-detail-close" id="poiDetailClose" type="button" aria-label="关闭">×</button>
        </div>
        <p class="poi-detail-desc" id="poi-detail-desc"></p>
        <div class="poi-detail-actions">
          <button class="poi-detail-photo" id="poiDetailPhoto" type="button">📸 拍照打卡</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    this.detailOverlay = overlay;
    this.detailPanel = document.getElementById('poi-detail-panel');
    this.detailTypeEl = document.getElementById('poi-detail-type');
    this.detailTitleEl = document.getElementById('poi-detail-title');
    this.detailDescEl = document.getElementById('poi-detail-desc');
    this.photoBtn = document.getElementById('poiDetailPhoto');
    this.detailCloseBtn = document.getElementById('poiDetailClose');

    this.detailCloseBtn.addEventListener('click', () => this._closeDetailPanel());
    this.photoBtn.addEventListener('click', () => this._takePhotoOfSelected());
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) this._closeDetailPanel();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.detailOverlay?.classList.contains('show')) {
        this._closeDetailPanel();
      }
    });
  }

  /**
   * 打开指定 POI 的详情面板，展示名称、类型、描述与拍照打卡入口。
   * @param {number|string} mapId - 地图地点 ID
   */
  _openDetailPanel(mapId) {
    if (mapId == null) {
      this._closeDetailPanel();
      return;
    }
    const loc = mapData.getLocationById(mapId);
    if (!loc) {
      this._closeDetailPanel();
      return;
    }
    this._currentDetailLoc = loc;
    const cfg = TYPES[loc.map_type] || { label: '地点', icon: '', color: '#999' };
    this.detailTypeEl.textContent = `${cfg.icon || ''} ${cfg.label || '地点'}`.trim();
    this.detailTypeEl.style.borderColor = cfg.color || '#999';
    this.detailTypeEl.style.color = cfg.color || '#999';
    this.detailTitleEl.textContent = loc.map_name;
    this.detailDescEl.textContent = loc.description || DEFAULT_DESCRIPTION;
    this._updatePhotoButton();
    this.detailOverlay.classList.add('show');
    this.detailOverlay.setAttribute('aria-hidden', 'false');
  }

  /**
   * 关闭 POI 详情面板并清空当前选中地点。
   */
  _closeDetailPanel() {
    this.detailOverlay?.classList.remove('show');
    this.detailOverlay?.setAttribute('aria-hidden', 'true');
    this._currentDetailLoc = null;
  }

  /**
   * 根据当前地点的拍照状态更新拍照按钮文案与禁用状态。
   */
  _updatePhotoButton() {
    if (!this.photoBtn || !this._currentDetailLoc) return;
    const taken = this.visitedPhotoIds.has(this._currentDetailLoc.map_id);
    const text = taken ? '✓ 已拍照打卡' : '📸 拍照打卡';
    if (this.photoBtn.textContent !== text) this.photoBtn.textContent = text;
    this.photoBtn.disabled = taken;
  }

  /**
   * 对当前选中的 POI 进行拍照打卡。
   * 首次拍照解锁 first_poi_visit；累计在 5 个不同地点拍照后解锁 photo_pioneer。
   */
  _takePhotoOfSelected() {
    const loc = this._currentDetailLoc || (this.selectedId != null ? mapData.getLocationById(this.selectedId) : null);
    if (!loc) return;
    if (this.visitedPhotoIds.has(loc.map_id)) return;

    this.visitedPhotoIds.add(loc.map_id);
    this._savePhotoIds();
    this._updatePhotoButton();

    const photoCount = this.visitedPhotoIds.size;
    if (photoCount === 1) this._unlockLocalAchievement('first_poi_visit', 'photo');
    if (photoCount >= PHOTO_PIONEER_TARGET) this._unlockLocalAchievement('photo_pioneer', 'photo');
    EventBus.emit('exploration:photo', { location: loc });
    const progress = `${Math.min(photoCount, PHOTO_PIONEER_TARGET)}/${PHOTO_PIONEER_TARGET}`;
    this._showToast(`已拍照打卡：${loc.map_name}（摄影进度 ${progress}）`);
  }

  /**
   * 在独立地图页中持久化成就，并通知可能已加载的游戏系统。
   * @param {string} achievementId - 成就 ID
   * @param {string} source - 解锁来源
   * @returns {boolean} 本次是否首次解锁
   */
  _unlockLocalAchievement(achievementId, source) {
    try {
      const raw = localStorage.getItem(ACHIEVEMENT_STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr) || arr.includes(achievementId)) return false;
      arr.push(achievementId);
      localStorage.setItem(ACHIEVEMENT_STORAGE_KEY, JSON.stringify(arr));
      EventBus.emit('achievement:unlock', { achievementId, source });
      return true;
    } catch {
      return false;
    }
  }

  _renderSearchResults(query) {
    if (!mapData.loaded) return;

    const q = query.trim().toLowerCase();
    const ch = character.getPos();
    const locations = mapData.getAllLocations()
      .map(loc => ({
        loc,
        distance: Math.hypot(loc.x - ch.x, loc.y - ch.y),
      }))
      .filter(({ loc }) => !q || loc.map_name.toLowerCase().includes(q) || (TYPES[loc.map_type]?.label || '').includes(q))
      .sort((a, b) => {
        if (!q) return a.distance - b.distance;
        const aExact = a.loc.map_name.toLowerCase().startsWith(q) ? 0 : 1;
        const bExact = b.loc.map_name.toLowerCase().startsWith(q) ? 0 : 1;
        return aExact - bExact || a.distance - b.distance;
      })
      .slice(0, q ? 8 : 5);

    if (!locations.length) {
      this.searchResults.innerHTML = '<div class="map-search-empty">没有找到地点</div>';
      return;
    }

    this.searchResults.innerHTML = locations.map(({ loc, distance }) => {
      const cfg = TYPES[loc.map_type];
      return `
        <div class="map-search-item" data-loc-id="${loc.map_id}">
          <span class="map-search-dot" style="background:${cfg?.color || '#999'}"></span>
          <button class="map-search-main" type="button">
            <span>${this._escapeHTML(loc.map_name)}</span>
            <small>${this._escapeHTML(cfg?.label || '地点')} · ${this._formatDistance(distance)}</small>
          </button>
          <div class="map-search-actions">
            <button type="button" data-search-action="walk">步行</button>
          </div>
        </div>
      `;
    }).join('');
  }

  _focusLocation(mapId) {
    const loc = mapData.getLocationById(mapId);
    if (!loc) return;
    EventBus.emit('location:select', { map_id: loc.map_id });
    this._setSearchFocus(loc);
    coordSys.centerOn(loc.x, loc.y, window.innerWidth, window.innerHeight);
    document.getElementById('sidePanel')?.classList.add('open');
    document.getElementById('panelToggle')?.classList.add('active');
  }

  _walkToLocation(mapId) {
    const loc = mapData.getLocationById(mapId);
    if (!loc) return;
    this._focusLocation(mapId);
    EventBus.emit('location:click', { worldX: loc.x, worldY: loc.y, mapId: loc.map_id, label: loc.map_name });
    this._showToast(`正在前往 ${loc.map_name}`);
  }

  _setSearchFocus(loc) {
    this.searchFocus = { loc, startedAt: performance.now() };
    window.setTimeout(() => {
      if (this.searchFocus?.loc.map_id === loc.map_id) this.searchFocus = null;
    }, 2600);
  }

  _drawMinimap() {
    if (!mapData.loaded || !this.minimapCtx) return;
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    const sx = w / MAP.width;
    const sy = h / MAP.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#07111f';
    ctx.fillRect(0, 0, w, h);

    if (mapData.bgImg) {
      ctx.globalAlpha = 0.7;
      ctx.drawImage(mapData.bgImg, 0, 0, w, h);
      ctx.globalAlpha = 1;
    }

    for (const loc of mapData.getAllLocations()) {
      const cfg = TYPES[loc.map_type];
      ctx.beginPath();
      ctx.arc(loc.x * sx, loc.y * sy, loc.map_id === this.selectedId ? 3.8 : 2.2, 0, Math.PI * 2);
      ctx.fillStyle = cfg?.color || '#fff';
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(238,244,251,.82)';
    ctx.font = '700 18px "Segoe UI Variable", "Microsoft YaHei UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', w - 22, 24);

    const ch = character.getPos();
    ctx.beginPath();
    ctx.arc(ch.x * sx, ch.y * sy, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#f3d484';
    ctx.fill();
    ctx.strokeStyle = '#07111f';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    const origin = coordSys.getOrigin();
    const vw = window.innerWidth / coordSys.getScale();
    const vh = window.innerHeight / coordSys.getScale();
    const viewX = Math.max(0, origin.x * sx);
    const viewY = Math.max(0, origin.y * sy);
    const viewW = Math.min(w - viewX, vw * sx);
    const viewH = Math.min(h - viewY, vh * sy);
    ctx.fillStyle = 'rgba(34, 189, 208, 0.08)';
    ctx.fillRect(viewX, viewY, viewW, viewH);
    ctx.strokeStyle = 'rgba(109, 213, 223, 0.95)';
    ctx.lineWidth = 2;
    ctx.strokeRect(viewX, viewY, viewW, viewH);

    const scaleEl = document.getElementById('minimapScale');
    if (scaleEl) scaleEl.textContent = `${coordSys.getScale().toFixed(2)}×`;
  }

  _getCheckinTargets() {
    return mapData.getAllLocations().filter(loc => CHECKIN_TYPES.has(loc.map_type));
  }

  /**
   * 更新打卡按钮与进度文本。性能优化 5.1e：仅在目标/状态变化时修改 DOM，
   * 避免 character:move 每帧触发导致 innerHTML 重写。
   */
  _updateCheckinState() {
    if (!mapData.loaded) return;

    const ch = character.getPos();
    const targets = this._getCheckinTargets();
    let nearest = null;
    let bestDist = CHECKIN_RADIUS;

    for (const loc of targets) {
      const dist = Math.hypot(loc.x - ch.x, loc.y - ch.y);
      if (dist <= bestDist) {
        bestDist = dist;
        nearest = loc;
      }
    }

    const targetChanged = (nearest?.map_id ?? null) !== this._lastCheckinTargetId;
    this.currentTarget = nearest;

    const checkedCount = targets.filter(loc => this.checkedIds.has(loc.map_id)).length;
    const progressText = `${checkedCount} / ${targets.length}`;
    if (this._lastProgressText !== progressText && this.progressText) {
      this.progressText.textContent = progressText;
      this._lastProgressText = progressText;
    }

    // 列表 HTML 只有在数据变化时才重渲染
    this._renderCheckinList();

    let buttonText;
    let buttonDisabled;
    if (!nearest) {
      buttonDisabled = true;
      buttonText = '靠近地标打卡';
    } else {
      const checked = this.checkedIds.has(nearest.map_id);
      buttonDisabled = checked;
      buttonText = checked ? `${nearest.map_name} 已打卡` : `按 F 打卡：${nearest.map_name}`;
      if (!checked) {
      }
    }

    if (targetChanged || this._lastCheckinButtonText !== buttonText) {
      this.checkinButton.disabled = buttonDisabled;
      this.checkinButton.textContent = buttonText;
      this._lastCheckinButtonText = buttonText;
      this._lastCheckinTargetId = nearest?.map_id ?? null;
    }
  }

  _tryCheckin() {
    if (!this.currentTarget || this.checkedIds.has(this.currentTarget.map_id)) return;
    this.checkedIds.add(this.currentTarget.map_id);
    this._saveCheckedIds();
    EventBus.emit('exploration:checkin', { location: this.currentTarget });
    EventBus.emit('location:select', { map_id: this.currentTarget.map_id });
    this._showToast(`已完成 ${this.currentTarget.map_name} 打卡`);
    // 打卡后状态确实变化，强制刷新缓存并更新 UI
    this._lastCheckinTargetId = null;
    this._lastProgressText = null;
    this._lastCheckinListHtml = null;
    this._lastCheckinStatsText = null;
    this._updateCheckinState();
  }

  _openCheckinList() {
    this._renderCheckinList();
    this.checkinOverlay.classList.add('show');
  }

  _closeCheckinList() {
    this.checkinOverlay.classList.remove('show');
  }

  /**
   * 渲染打卡列表。性能优化 5.1e：通过比较缓存的 HTML 字符串，仅在内容变化时重写 innerHTML。
   */
  _renderCheckinList() {
    if (!mapData.loaded || !this.checkinListBody) return;

    const targets = this._getCheckinTargets();
    const checkedCount = targets.filter(loc => this.checkedIds.has(loc.map_id)).length;
    const statsText = `${checkedCount} / ${targets.length} 已完成`;
    if (this._lastCheckinStatsText !== statsText && this.checkinListStats) {
      this.checkinListStats.textContent = statsText;
      this._lastCheckinStatsText = statsText;
    }

    const html = targets
      .map(loc => {
        const checked = this.checkedIds.has(loc.map_id);
        const cfg = TYPES[loc.map_type];
        return `
          <button class="checkin-list-item${checked ? ' checked' : ''}" type="button" data-checkin-loc-id="${loc.map_id}">
            <span class="checkin-list-dot" style="background:${cfg?.color || '#999'}"></span>
            <span class="checkin-list-main">
              <strong>${this._escapeHTML(loc.map_name)}</strong>
              <small>${this._escapeHTML(cfg?.label || '地点')} · (${Math.round(loc.x)}, ${Math.round(loc.y)})</small>
            </span>
            <span class="checkin-list-state">${checked ? '已打卡' : '未打卡'}</span>
          </button>
        `;
      })
      .join('');

    if (this._lastCheckinListHtml !== html) {
      this.checkinListBody.innerHTML = html;
      this._lastCheckinListHtml = html;
    }
  }

  _drawCheckinMarkers(ctx, cs) {
    if (!mapData.loaded) return;

    const scale = cs.getScale();
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (const loc of this._getCheckinTargets()) {
      const p = cs.worldToScreen(loc.x, loc.y);
      if (p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20) continue;

      const checked = this.checkedIds.has(loc.map_id);
      const radius = Math.max(8, Math.min(18, 12 * scale));
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = checked ? 'rgba(121, 217, 120, 0.95)' : 'rgba(240, 199, 102, 0.9)';
      ctx.lineWidth = checked ? 3 : 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = checked ? '#79d978' : '#f0c766';
      ctx.fill();
      ctx.restore();
    }
  }

  _drawSearchFocus(ctx, cs) {
    if (!this.searchFocus) return;
    const { loc, startedAt } = this.searchFocus;
    const elapsed = performance.now() - startedAt;
    const progress = Math.min(1, elapsed / 2600);
    const p = cs.worldToScreen(loc.x, loc.y);
    const pulse = this._reducedMotion ? 1 : 1 + Math.sin(elapsed / 130) * 0.08;
    const radius = (28 + progress * 18) * pulse;

    ctx.save();
    ctx.globalAlpha = 1 - progress * 0.65;
    ctx.strokeStyle = 'rgba(218, 0, 0, 0.95)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(206, 168, 112, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius + 9, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(4, 14, 38, 0.88)';
    ctx.strokeStyle = 'rgba(206, 168, 112, 0.68)';
    this._roundRect(ctx, p.x + 14, p.y - 42, 118, 30, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "Microsoft YaHei", Arial';
    ctx.textAlign = 'left';
    ctx.fillText(loc.map_name, p.x + 24, p.y - 22);
    ctx.restore();
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /**
   * 根据当前真实月份应用季节 CSS 类：3-4 月樱花、10-11 月银杏。
   */
  _applySeason() {
    const month = new Date().getMonth() + 1;
    document.body.classList.remove('season-sakura', 'season-ginkgo');
    if (month >= 3 && month <= 4) {
      document.body.classList.add('season-sakura');
      this._season = 'sakura';
    } else if (month >= 10 && month <= 11) {
      document.body.classList.add('season-ginkgo');
      this._season = 'ginkgo';
    } else {
      this._season = null;
    }
  }

  /**
   * 在 canvas 上绘制季节色调。当 prefers-reduced-motion 开启时，
   * 跳过动态飘落粒子，仅保留静态渐变覆盖。
   * @param {CanvasRenderingContext2D} ctx
   */
  _drawSeasonTint(ctx) {
    if (!this._season) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const prefersReduced = this._reducedMotion;
    ctx.save();
    if (this._season === 'sakura') {
      const gradient = ctx.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, 'rgba(255, 183, 197, 0.18)');
      gradient.addColorStop(1, 'rgba(255, 218, 224, 0.10)');
      ctx.fillStyle = gradient;
    } else {
      const gradient = ctx.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, 'rgba(255, 204, 0, 0.18)');
      gradient.addColorStop(1, 'rgba(255, 230, 120, 0.10)');
      ctx.fillStyle = gradient;
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillRect(0, 0, w, h);

    if (!prefersReduced) {
      ctx.globalAlpha = 0.06;
      const now = performance.now();
      const count = 7;
      for (let i = 0; i < count; i++) {
        const x = ((i * 137.5 + now * 0.02) % (w + 60)) - 30;
        const y = ((i * 73.3 + now * 0.015) % (h + 60)) - 30;
        const size = this._season === 'sakura' ? 5 + (i % 4) : 7 + (i % 5);
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = this._season === 'sakura' ? 'rgba(255, 192, 203, 0.35)' : 'rgba(255, 215, 0, 0.35)';
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /**
   * 显示 Toast。可访问性 5.2b：prefers-reduced-motion 开启时直接显示，
   * 不播放进入动画；关闭时仍使用 CSS 过渡。
   */
  _showToast(text) {
    const toast = document.createElement('div');
    toast.className = 'map-toast';
    toast.textContent = text;
    document.body.appendChild(toast);
    if (this._reducedMotion) {
      toast.classList.add('show');
      window.setTimeout(() => {
        toast.remove();
      }, 1800);
    } else {
      window.setTimeout(() => toast.classList.add('show'), 20);
      window.setTimeout(() => {
        toast.classList.remove('show');
        window.setTimeout(() => toast.remove(), 240);
      }, 1800);
    }
  }

  _loadCheckedIds() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  _saveCheckedIds() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.checkedIds]));
  }

  _loadPhotoIds() {
    try {
      const raw = localStorage.getItem(PHOTO_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  _savePhotoIds() {
    localStorage.setItem(PHOTO_STORAGE_KEY, JSON.stringify([...this.visitedPhotoIds]));
  }

  _formatDistance(distance) {
    return distance >= 1000 ? `${(distance / 1000).toFixed(1)}km` : `${Math.round(distance)}m`;
  }

  _escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[ch]));
  }
}

const mapEnhancements = new MapEnhancements();
mapEnhancements.init();

export { mapEnhancements };
