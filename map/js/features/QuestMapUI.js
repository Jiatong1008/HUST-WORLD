import { QuestTriggerUI } from '../../../game/js/ui/QuestTriggerUI.js';
import questTriggerManager from '../../../game/js/managers/QuestTriggerManager.js';

function ensureTimeSystem() {
  if (window.timeSystem) return;

  const currentTime = { year: 2024, semester: 1, week: 1, day: 1, hour: 8 };
  window.timeSystem = {
    getCurrentTime: () => ({ ...currentTime }),
    getTime: () => ({ ...currentTime }),
    setTime: (nextTime = {}) => Object.assign(currentTime, nextTime),
    advanceTime: () => {},
    advanceTimeByMinutes: () => {},
    subscribe: () => {}
  };
}

function ensureQuestLogShortcut() {
  if (window.__hustWorldQuestLogShortcutBound) return;
  window.__hustWorldQuestLogShortcutBound = true;

  const handleQuestLogShortcut = event => {
    if ((event.key || '').toLowerCase() !== 'j') return;
    const tagName = event.target?.tagName?.toLowerCase();
    if (['input', 'textarea', 'select'].includes(tagName)) return;
    if (!window.questTriggerUI?.toggleStatusBar) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    window.questTriggerUI.toggleStatusBar();
  };

  window.addEventListener('keydown', handleQuestLogShortcut, true);
  document.addEventListener('keydown', handleQuestLogShortcut, true);
}

function ensureQuestTrackerBar() {
  if (document.getElementById('quest-tracker-bar')) return;

  const bar = document.createElement('div');
  bar.id = 'quest-tracker-bar';
  bar.style.cssText = `
    position: fixed;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9500;
    max-width: 560px;
    width: 92%;
    background: rgba(12, 14, 33, 0.92);
    border: 1px solid rgba(255, 215, 0, 0.25);
    border-radius: 12px;
    padding: 10px 16px;
    color: #ffd700;
    font-family: 'Microsoft YaHei', Arial, sans-serif;
    font-size: 13px;
    font-weight: 600;
    box-shadow: 0 10px 30px rgba(0,0,0,0.35);
    display: none;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    cursor: pointer;
  `;
  bar.innerHTML = `
    <span id="quest-tracker-text">暂无追踪任务</span>
    <span style="color:#9ca3af;font-size:11px;">[J] 任务日志</span>
  `;
  document.body.appendChild(bar);

  bar.addEventListener('click', () => {
    if (window.questTriggerUI?.toggleStatusBar) window.questTriggerUI.toggleStatusBar();
  });
}

function updateQuestTrackerBar() {
  const bar = document.getElementById('quest-tracker-bar');
  const text = document.getElementById('quest-tracker-text');
  if (!bar || !text) return;

  const qtm = window.questTriggerManager;
  const saveManager = window.saveManager;
  if (!qtm || !saveManager) return;

  const progress = saveManager.getProgress?.() || {};
  const trackedQuestId = progress.trackedQuestId || qtm.trackedQuestId;
  if (!trackedQuestId) {
    bar.style.display = 'none';
    return;
  }

  const quest = qtm.getTrackedQuest?.() || qtm.getQuestDetail?.(trackedQuestId) || qtm.getSideQuestDetail?.(trackedQuestId);
  if (!quest) {
    bar.style.display = 'none';
    return;
  }

  const status = quest.status || 'LOCKED';
  const statusLabel = {
    AVAILABLE: '可接取',
    ACTIVE: '进行中',
    READY_TO_COMPLETE: '可交付',
    COMPLETED: '已完成'
  }[status] || '';

  text.textContent = `追踪：${quest.title || quest.name || trackedQuestId}${statusLabel ? ' · ' + statusLabel : ''}`;
  bar.style.display = 'flex';
}

function restoreTrackedQuest() {
  const saveManager = window.saveManager;
  const qtm = window.questTriggerManager;
  if (!saveManager || !qtm) return;

  const progress = saveManager.getProgress?.() || {};
  const trackedQuestId = progress.trackedQuestId;
  if (trackedQuestId && qtm.setTrackedQuest) {
    qtm.setTrackedQuest(trackedQuestId, progress.trackedQuestKind || null);
  }
}

function initQuestMapUI() {
  console.log('[QuestMapUI] initQuestMapUI called');
  if (typeof window === 'undefined') return;

  ensureTimeSystem();
  ensureQuestTrackerBar();

  if (!window.questTriggerManager) {
    window.questTriggerManager = questTriggerManager;
  }

  if (!window.questTriggerUI) {
    try {
      window.questTriggerUI = new QuestTriggerUI();
      window.questTriggerUI.init?.();
      console.log('[QuestMapUI] quest UI initialized');
    } catch (e) {
      console.warn('[QuestMapUI] quest UI init failed:', e.message);
      console.error(e);
    }
  }

  ensureQuestLogShortcut();

  if (window.saveManager && window.questTriggerManager) {
    try {
      const snapshot = window.saveManager.loadLocal();
      if (snapshot?.progress) {
        window.questTriggerManager.loadProgress(snapshot.progress);
        window.saveManager.applyProgress(snapshot.progress);
        restoreTrackedQuest();
      }
    } catch (e) {
      console.warn('[QuestMapUI] load save failed:', e.message);
    }
  }

  updateQuestTrackerBar();

  window.questTriggerManager?.addListener?.('quest:activated', updateQuestTrackerBar);
  window.questTriggerManager?.addListener?.('quest:completed', updateQuestTrackerBar);
  window.questTriggerManager?.addListener?.('quest:readyToComplete', updateQuestTrackerBar);
  window.questTriggerManager?.addListener?.('sideQuest:activated', updateQuestTrackerBar);
  window.questTriggerManager?.addListener?.('sideQuest:completed', updateQuestTrackerBar);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initQuestMapUI);
} else {
  initQuestMapUI();
}

export { initQuestMapUI, updateQuestTrackerBar, restoreTrackedQuest };
export default initQuestMapUI;
