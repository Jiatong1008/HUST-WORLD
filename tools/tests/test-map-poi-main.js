/**
 * test-map-poi-main.js — 地图 POI 调试面板主逻辑
 */

import { questPoiBinder } from '../../map/js/features/QuestPoiBinder.js';
import { mapSceneManager } from '../../map/js/features/MapSceneManager.js';
import { QuestTriggerManager } from '../../game/js/managers/QuestTriggerManager.js';

const logEl = document.getElementById('log');
function log(msg, type = 'info') {
  const cls = type === 'ok' ? 'status-ok' : type === 'warn' ? 'status-warn' : type === 'err' ? 'status-err' : '';
  logEl.innerHTML += `<div class="${cls}">${new Date().toLocaleTimeString()} ${msg}</div>`;
  logEl.scrollTop = logEl.scrollHeight;
}
window.__testLog = log;

window.onerror = (msg, url, line, col, err) => {
  log(`JS Error: ${msg} @ ${url}:${line}:${col}`, 'err');
  console.error(err);
};

try {
  window.questPoiBinder = questPoiBinder;
  window.mapSceneManager = mapSceneManager;
  window.questMapIntegration = { trackQuest: (id, kind) => log(`追踪任务: ${id} (${kind})`, 'info') };

  window.timeSystem = {
    getGameTime: () => ({ year: 1, semester: 1, week: 4, day: 1, hour: 10, minute: 0 })
  };

  const SAVE_KEY = 'hust_world_test_progress';

  const defaultGameTime = () => ({ year: 2024, semester: 1, week: 4, day: 1, hour: 10, minute: 0 });
  const defaultStats = () => ({ knowledge: 10, social: 10, stamina: 10, mood: 10, money: 100, experience: 0 });
  const buildSnapshot = () => ({
    progress: {
      currentPhaseIndex: 0,
      sideQuests: { status: {}, progress: {}, joinedClubs: [], inventory: [], achievements: [] },
      trackedQuestId: null,
      trackedQuestKind: null,
      trackedQuestGroup: null,
      trackedPoiId: null,
      currentSceneId: 'campus',
      gameTime: defaultGameTime(),
      stats: defaultStats()
    },
    stats: defaultStats(),
    gameTime: defaultGameTime()
  });

  window.saveManager = {
    loadLocal: () => {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) { console.warn('loadLocal failed', e); }
      return buildSnapshot();
    },
    saveLocal: (snapshot) => {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
      } catch (e) { console.warn('saveLocal failed', e); }
    },
    save: () => {
      const snapshot = window.saveManager.buildSnapshot();
      window.saveManager.saveLocal(snapshot);
    },
    getProgress: () => window.saveManager.loadLocal().progress,
    setProgressField: (key, value) => {
      const snap = window.saveManager.loadLocal();
      snap.progress[key] = value;
      window.saveManager.saveLocal(snap);
    },
    getProgressField: (key) => window.saveManager.loadLocal().progress[key],
    getStats: () => window.saveManager.loadLocal().progress?.stats || defaultStats(),
    buildSnapshot: () => {
      const snap = window.saveManager.loadLocal();
      const trackingFields = {
        trackedQuestId: snap.progress.trackedQuestId,
        trackedQuestKind: snap.progress.trackedQuestKind,
        trackedQuestGroup: snap.progress.trackedQuestGroup,
        trackedPoiId: snap.progress.trackedPoiId,
        currentSceneId: snap.progress.currentSceneId
      };
      if (window.questTriggerManager?.exportProgress) {
        Object.assign(snap.progress, window.questTriggerManager.exportProgress());
      }
      Object.assign(snap.progress, trackingFields);
      snap.progress.gameTime = snap.progress.gameTime || defaultGameTime();
      snap.progress.stats = snap.progress.stats || defaultStats();
      return snap;
    },
    applyProgress: (progress) => {
      const snap = window.saveManager.loadLocal();
      Object.assign(snap.progress, progress);
      snap.progress.gameTime = snap.progress.gameTime || defaultGameTime();
      snap.progress.stats = snap.progress.stats || defaultStats();
      window.saveManager.saveLocal(snap);
      window.questTriggerManager?.loadProgress?.(snap.progress);
    }
  };

  try {
    window.questTriggerManager = new QuestTriggerManager();
    const snap = window.saveManager.loadLocal();
    if (snap?.progress) window.questTriggerManager.loadProgress?.(snap.progress);
    document.getElementById('progress-summary').textContent =
      `主线阶段：${snap.progress?.currentPhaseIndex ?? 0} | 已完成支线：${Object.values(snap.progress?.sideQuests?.status || {}).filter(s => s === 'COMPLETED').length}`;
  } catch (e) {
    log('QuestTriggerManager 初始化失败: ' + e.message, 'err');
    document.getElementById('progress-summary').textContent = '任务管理器初始化失败';
    window.questTriggerManager = null;
  }

  window.debugMapPoiBindings = async () => {
    try {
      await questPoiBinder.init();
      const report = questPoiBinder.exportReport();
      document.getElementById('poi-status').innerHTML = `
        总数: ${report.totalQuests} |
        <span class="status-ok">已绑定: ${report.bound}</span> |
        <span class="status-warn">特殊: ${report.special}</span> |
        <span class="status-err">待配置: ${report.unbound}</span>
      `;
      const tbody = document.querySelector('#poi-table tbody');
      tbody.innerHTML = report.bindings.map(b => {
        const cls = b.status === 'bound' ? 'status-ok' : b.status === 'special' ? 'status-warn' : 'status-err';
        return `<tr>
          <td>${b.questId}</td>
          <td>${b.questName}</td>
          <td>${b.questType}</td>
          <td>${b.group}</td>
          <td>${b.poiName || b.warning || '-'}</td>
          <td class="${cls}">${b.status}</td>
        </tr>`;
      }).join('');
      log('POI 解析完成：' + JSON.stringify({ total: report.totalQuests, bound: report.bound, unbound: report.unbound }), report.unbound ? 'warn' : 'ok');
    } catch (e) {
      log('POI 解析失败: ' + e.message, 'err');
    }
  };

  window.debugClickPoi = (poiName) => {
    try {
      log('模拟点击 POI: ' + poiName, 'info');
      const event = new CustomEvent('location:select', { detail: { map_name: poiName } });
      window.dispatchEvent(event);
    } catch (e) {
      log('模拟点击失败: ' + e.message, 'err');
    }
  };

  window.debugApproachPoi = (poiName) => {
    log('模拟靠近 POI: ' + poiName, 'info');
  };

  window.debugTrackQuest = (questId, kind) => {
    const binding = questPoiBinder.getBindingByQuestId(questId);
    if (!binding) {
      log('未找到任务绑定: ' + questId, 'warn');
      return;
    }
    log(`追踪任务: ${binding.questName} -> ${binding.poiName || '未知POI'}`, 'ok');
  };

  window.debugTriggerQuest = async (questId) => {
    try {
      if (!window.questTriggerManager) throw new Error('QuestTriggerManager 未初始化');
      await window.questTriggerManager.completeQuest(questId, { force: true });
      log(`${questId} 已触发完成`, 'ok');
      window.saveManager.save();
    } catch (e) {
      log('触发失败: ' + e.message, 'err');
    }
  };

  window.debugEnterScene = (sceneId) => {
    try {
      mapSceneManager.enterScene(sceneId);
      document.getElementById('current-scene').textContent = '当前场景：' + sceneId;
      log('进入场景: ' + sceneId, 'ok');
    } catch (e) {
      log('进入场景失败: ' + e.message, 'err');
    }
  };

  window.debugReturnCampus = () => {
    try {
      mapSceneManager.returnToCampus();
      document.getElementById('current-scene').textContent = '当前场景：campus';
      log('返回校园', 'ok');
    } catch (e) {
      log('返回校园失败: ' + e.message, 'err');
    }
  };

  window.debugResetSideQuests = () => {
    try {
      if (!window.questTriggerManager) throw new Error('QuestTriggerManager 未初始化');
      window.questTriggerManager.resetSideQuests?.();
      window.saveManager.save();
      log('支线任务已重置', 'ok');
      document.getElementById('progress-summary').textContent = '支线任务已重置';
    } catch (e) {
      log('重置失败: ' + e.message, 'err');
    }
  };

  window.debugExportFullProgress = () => {
    const data = window.saveManager.buildSnapshot();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hust-world-progress.json';
    a.click();
    log('已导出完整进度 JSON', 'ok');
  };

  window.debugExportPoiReport = () => {
    const report = questPoiBinder.exportReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'poi-bindings-report.json';
    a.click();
    log('已导出 POI 绑定报告', 'ok');
  };

  log('调试面板已加载，先点击「测试 POI 解析」');
} catch (e) {
  log('调试面板初始化失败: ' + e.message, 'err');
  console.error(e);
}
