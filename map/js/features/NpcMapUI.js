import { NpcDialogueUI } from '../../../game/js/ui/NpcDialogueUI.js';
import { getNpcsByPoiId, getNpcsBySceneId, getNpcById } from '../../../game/js/config/NpcConfig.js';
import { imageManager } from '../ImageManager.js';
import { EventBus } from '../EventBus.js';
import { mapData } from '../MapData.js';
import { coordSys } from '../CoordSys.js';

function waitForGlobal(keys, timeout = 8000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      if (keys.every(k => typeof window[k] !== 'undefined')) { resolve(true); return; }
      if (Date.now() - start > timeout) { resolve(false); return; }
      setTimeout(check, 80);
    };
    check();
  });
}

const STATUS_LABELS = {
  AVAILABLE: '可接取',
  IN_PROGRESS: '任务进行中',
  COMPLETABLE: '可交付',
  NORMAL: '可交谈'
};

const STATUS_COLORS = {
  AVAILABLE: '#4ade80',
  IN_PROGRESS: '#60a5fa',
  COMPLETABLE: '#fbbf24',
  NORMAL: '#9ca3af'
};

function getNpcQuestStatus(npc, qtm) {
  if (!qtm || !npc) return 'NORMAL';
  const questIds = [...(npc.questIds || []), ...(npc.sideQuestIds || [])];
  if (!questIds.length) return 'NORMAL';

  let hasAvailable = false;
  for (const qid of questIds) {
    const status = qtm._getQuestStatus?.(qid) || qtm.questStatus?.[qid] || qtm.sideQuestStatus?.[qid] || 'LOCKED';
    if (status === 'READY_TO_COMPLETE') return 'COMPLETABLE';
    if (status === 'ACTIVE') return 'IN_PROGRESS';
    if (status === 'AVAILABLE' || status === 'PREREQ_MET') hasAvailable = true;
  }
  if (hasAvailable) return 'AVAILABLE';
  return 'NORMAL';
}

class NpcMapUI {
  constructor() {
    this.dialogueUI = null;
    this.initialized = false;
    this.markerLayer = null;
    this._markers = [];
    this._markerData = new Map();
  }

  async init() {
    if (this.initialized) return;
    await waitForGlobal(['saveManager', 'questTriggerManager']);
    this.dialogueUI = new NpcDialogueUI({
      saveManager: window.saveManager,
      questManager: window.questTriggerManager,
      onClose: () => this._onDialogueClose(),
      onQuestUpdate: () => this._onQuestUpdate()
    });
    this._ensureMarkerLayer();
    this._bindEvents();
    this.initialized = true;
    window.npcMapUI = this;
    this._refreshMarkers();
  }

  _ensureMarkerLayer() {
    if (this.markerLayer) return;
    this.markerLayer = document.createElement('div');
    this.markerLayer.id = 'npc-map-marker-layer';
    this.markerLayer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 5;
    `;
    document.body.appendChild(this.markerLayer);
  }

  _bindEvents() {
    EventBus.on('render:post', () => this._refreshMarkers());
    EventBus.on('viewport:change', () => this._refreshMarkers());
    EventBus.on('character:move', () => this._refreshMarkers());
    EventBus.on('scene:entered', () => this._refreshMarkers());
    EventBus.on('scene:returned', () => this._refreshMarkers());
    document.addEventListener('click', (e) => {
      const marker = e.target.closest('.npc-map-marker');
      if (marker) {
        e.stopPropagation();
        const npcId = marker.dataset.npcId;
        if (npcId) this.openNpc(npcId);
      }
    });
  }

  openNpc(npcId) {
    if (!this.initialized) return false;
    this.dialogueUI.open(npcId);
    return true;
  }

  openDialogue(dialogueId) {
    if (!this.initialized) return false;
    this.dialogueUI.openByDialogueId(dialogueId);
    return true;
  }

  getNpcsForPoi(poiId) {
    return getNpcsByPoiId(poiId);
  }

  getNpcsForScene(sceneId) {
    return getNpcsBySceneId(sceneId).filter(n => n.sceneId !== 'campus' || n.poiId != null);
  }

  renderNpcStatusLabel(npc) {
    const qtm = window.questTriggerManager;
    const status = getNpcQuestStatus(npc, qtm);
    return {
      status,
      label: STATUS_LABELS[status] || '可交谈',
      color: STATUS_COLORS[status] || '#9ca3af'
    };
  }

  renderQuestTags(npc) {
    const qtm = window.questTriggerManager;
    if (!qtm || !npc) return [];
    const questIds = [...(npc.questIds || []), ...(npc.sideQuestIds || [])];
    const tags = [];
    for (const qid of questIds) {
      const quest = qtm.getQuestDetail?.(qid) || qtm.getSideQuestDetail?.(qid);
      if (!quest) continue;
      const status = qtm._getQuestStatus?.(qid) || qtm.questStatus?.[qid] || qtm.sideQuestStatus?.[qid] || 'LOCKED';
      if (status === 'COMPLETED' || status === 'FAILED' || status === 'LOCKED') continue;
      const label = {
        AVAILABLE: '可接取',
        ACTIVE: '任务进行中',
        READY_TO_COMPLETE: '可交付'
      }[status] || '任务';
      tags.push({ qid, label, status, questName: quest.title || quest.name || qid });
    }
    return tags;
  }

  _renderTooltip(npc) {
    const status = this.renderNpcStatusLabel(npc);
    const tags = this.renderQuestTags(npc).slice(0, 2);
    return `
      <div class="npc-map-tooltip" style="
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%) translateY(-8px);
        min-width: 120px;
        max-width: 200px;
        padding: 10px 12px;
        background: rgba(15,23,42,0.96);
        border: 1px solid rgba(245,197,66,0.35);
        border-radius: 10px;
        box-shadow: 0 18px 50px rgba(0,0,0,0.48);
        color: #e5e7eb;
        font-family: \"PingFang SC\", \"Microsoft YaHei\", sans-serif;
        font-size: 12px;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s;
        z-index: 14;
      ">
        <div style="font-weight:700;color:#F5C542;margin-bottom:4px;">${this._escapeHTML(npc.name)}</div>
        <div style="color:${status.color};font-size:11px;margin-bottom:4px;">${this._escapeHTML(npc.title || npc.role || 'NPC')} · ${status.label}</div>
        ${tags.length ? `<div style="display:flex;gap:6px;flex-wrap:wrap;">${tags.map(t => `<span style="font-size:10px;padding:2px 6px;border-radius:999px;border:1px solid rgba(148,163,184,0.25);color:${t.status === 'ACTIVE' ? '#60a5fa' : t.status === 'READY_TO_COMPLETE' ? '#fbbf24' : '#4ade80'};">${t.label}</span>`).join('')}</div>` : ''}
      </div>
    `;
  }

  _renderMarker(npc, x, y) {
    const status = this.renderNpcStatusLabel(npc);
    const avatarUrl = imageManager.getImageUrl(npc.avatar || npc.npcId, npc.role);
    const fallbackUrl = imageManager.getImageUrl(npc.fallbackAvatar || 'default_npc_a', npc.role);
    const fallbackLabel = String(npc.name || 'NPC').trim().slice(0, 1) || 'N';
    const el = document.createElement('div');
    el.className = 'npc-map-marker';
    el.dataset.npcId = npc.npcId;
    el.dataset.status = status.status;
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', `与${npc.name || 'NPC'}交谈`);
    el.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: 48px;
      height: 48px;
      transform: translate(-50%, -50%);
      pointer-events: auto;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      z-index: 13;
    `;
    el.innerHTML = `
      <span class="npc-map-marker-shell" style="--npc-status-color:${status.color}">
        <img class="npc-map-marker-avatar" src="${this._escapeHTML(avatarUrl)}" alt="${this._escapeHTML(npc.name || 'NPC')}" draggable="false">
        <span class="npc-map-marker-fallback" aria-hidden="true">${this._escapeHTML(fallbackLabel)}</span>
        <span class="npc-map-marker-status" aria-hidden="true"></span>
      </span>
      ${this._renderTooltip(npc)}
    `;

    const avatar = el.querySelector('.npc-map-marker-avatar');
    const markerFallback = el.querySelector('.npc-map-marker-fallback');
    avatar.addEventListener('load', () => el.classList.add('has-avatar'));
    avatar.addEventListener('error', () => {
      if (avatar.dataset.fallbackTried !== 'true' && fallbackUrl && avatar.src !== fallbackUrl) {
        avatar.dataset.fallbackTried = 'true';
        avatar.src = fallbackUrl;
        return;
      }
      avatar.hidden = true;
      markerFallback.hidden = false;
      el.classList.remove('has-avatar');
    });

    el.addEventListener('mouseenter', () => {
      const tooltip = el.querySelector('.npc-map-tooltip');
      if (tooltip) tooltip.style.opacity = '1';
      el.style.transform = 'translate(-50%, -50%) scale(1.12)';
      el.style.zIndex = '15';
    });
    el.addEventListener('mouseleave', () => {
      const tooltip = el.querySelector('.npc-map-tooltip');
      if (tooltip) tooltip.style.opacity = '0';
      el.style.transform = 'translate(-50%, -50%) scale(1)';
      el.style.zIndex = '13';
    });
    el.addEventListener('touchstart', () => {
      const tooltip = el.querySelector('.npc-map-tooltip');
      if (tooltip) tooltip.style.opacity = '1';
      el.style.transform = 'translate(-50%, -50%) scale(1.12)';
      el.style.zIndex = '15';
    }, { passive: true });
    el.addEventListener('touchend', () => {
      setTimeout(() => {
        const tooltip = el.querySelector('.npc-map-tooltip');
        if (tooltip) tooltip.style.opacity = '0';
        el.style.transform = 'translate(-50%, -50%) scale(1)';
        el.style.zIndex = '13';
      }, 1500);
    }, { passive: true });
    el.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.openNpc(npc.npcId);
      }
    });

    return el;
  }

  _refreshMarkers() {
    if (!this.markerLayer || !mapData.loaded) return;
    const cs = window._coordSys || coordSys;
    const npcs = this._getAllRelevantNpcs();
    const existingIds = new Set(this._markerData.keys());

    const newIds = new Set();
    for (const npc of npcs) {
      newIds.add(npc.npcId);
      const pos = this._getNpcPosition(npc);
      if (!pos) continue;
      const screen = cs.worldToScreen(pos.x, pos.y);
      if (screen.x < -60 || screen.x > window.innerWidth + 60 || screen.y < -60 || screen.y > window.innerHeight + 60) {
        if (existingIds.has(npc.npcId)) this._removeMarker(npc.npcId);
        continue;
      }
      if (existingIds.has(npc.npcId)) {
        const data = this._markerData.get(npc.npcId);
        if (data) {
          data.el.style.left = `${screen.x}px`;
          data.el.style.top = `${screen.y}px`;
        }
      } else {
        const el = this._renderMarker(npc, screen.x, screen.y);
        this.markerLayer.appendChild(el);
        this._markerData.set(npc.npcId, { el, npc });
      }
    }

    for (const npcId of existingIds) {
      if (!newIds.has(npcId)) this._removeMarker(npcId);
    }
  }

  _removeMarker(npcId) {
    const data = this._markerData.get(npcId);
    if (data) {
      data.el.remove();
      this._markerData.delete(npcId);
    }
  }

  _getAllRelevantNpcs() {
    const sceneId = window.mapSceneManager?.currentSceneId || 'campus';
    if (sceneId !== 'campus') {
      return this.getNpcsForScene(sceneId);
    }
    const npcs = [];
    const seen = new Set();
    const source = window._mapData || mapData;
    const allPois = source.getAllLocations?.() || source.locations || [];
    for (const poi of allPois) {
      const poiNpcs = this.getNpcsForPoi(poi.map_id);
      for (const npc of poiNpcs) {
        if (!seen.has(npc.npcId)) {
          seen.add(npc.npcId);
          npcs.push(npc);
        }
      }
    }
    return npcs;
  }

  _getNpcPosition(npc) {
    if (npc.poiId) {
      const poi = window._mapData?.getLocationById?.(npc.poiId) || (window._mapData?.locations || []).find(p => p.map_id === npc.poiId);
      if (poi) return { x: poi.x, y: poi.y };
    }
    return null;
  }

  _showToast(message, type = 'info') {
    if (typeof window !== 'undefined' && window.UIFeedback) {
      window.UIFeedback.showToast(message, type);
    }
  }

  _onDialogueClose() {
    if (window.questMapIntegration) window.questMapIntegration._updatePoiPanel?.();
  }

  _onQuestUpdate() {
    if (window.questMapIntegration) window.questMapIntegration._updatePoiPanel?.();
    this._refreshMarkers();
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

const npcMapUI = new NpcMapUI();
npcMapUI.init().catch(() => {});

export { npcMapUI, NpcMapUI, getNpcQuestStatus };
export default npcMapUI;
