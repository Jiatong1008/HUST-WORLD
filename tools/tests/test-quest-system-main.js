import {
  QUEST_STATUS,
  QUEST_CATEGORY,
  getAllNormalizedQuests,
  getNormalizedQuestById,
  resolveQuestLocation,
  normalizeRewards
} from '../../game/js/config/QuestTriggerConfig.js';
import questManager from '../../game/js/managers/QuestTriggerManager.js';

window.saveManager = window.saveManager || new window.SaveManager();
window.questManager = questManager;
window.questTriggerManager = questManager;

let selectedQuestId = null;
let selectedQuestKind = 'all';

function showToast(message, color = '#FFD700') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.borderColor = color;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function logLine(text, ok = true) {
  const log = document.getElementById('debugLog');
  const line = document.createElement('div');
  line.className = `run-step ${ok ? 'step-ok' : 'step-fail'}`;
  line.textContent = `${ok ? '✅' : '❌'} ${text}`;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

function clearLog() {
  document.getElementById('debugLog').innerHTML = '';
}

function initDebug() {
  questManager.init({
    id: 'debug-quest-character',
    characterName: '调试角色',
    college: '计算机科学与技术学院',
    level: 1,
    experience: 0,
    money: 1000,
    stamina: 100,
    maxStamina: 100,
    mood: 50,
    social: 0,
    knowledge: 0,
    physical: 20
  });

  const saved = window.saveManager.loadLocal();
  if (saved && saved.progress) {
    questManager.loadProgress(saved.progress, true);
  }

  questManager.autoExamMode = true;
  questManager.autoWinExam = true;
  questManager.addListener('quest:available', (data) => {
    logLine(`任务可用：${data.quest?.name || data.questId}`);
  });
  questManager.addListener('quest:activated', (data) => {
    logLine(`任务已激活：${data.quest?.name || data.questId}`);
  });
  questManager.addListener('quest:completed', (data) => {
    logLine(`任务完成：${data.quest?.name || data.questId}`);
  });
  questManager.addListener('quest:readyToComplete', (data) => {
    logLine(`任务可交付：${data.quest?.name || data.questId}`);
  });
  questManager.addListener('sideQuest:available', (data) => {
    logLine(`支线任务可用：${data.quest?.title || data.questId}`);
  });
  questManager.addListener('sideQuest:activated', (data) => {
    logLine(`支线任务已激活：${data.quest?.title || data.questId}`);
  });
  questManager.addListener('sideQuest:completed', (data) => {
    logLine(`支线任务完成：${data.quest?.title || data.questId}`);
  });
  questManager.addListener('character:updated', () => {
    refreshStatus();
  });

  refreshUI();
  logLine('任务系统调试页已初始化', true);
}

function refreshUI() {
  refreshStatus();
  renderQuestList();
  renderQuestDetail();
  renderTrackedQuest();
  renderProgressJson();
}

function refreshStatus() {
  const phase = questManager.getCurrentPhase();
  const summary = questManager.getProgressSummary();
  const stats = questManager.characterStats;
  const time = questManager.gameTime;
  const sideProgress = questManager.getSideProgress();
  const allQuests = questManager.getAllQuestsWithStatus();
  const availableCount = allQuests.filter(q => q.status === QUEST_STATUS.AVAILABLE).length;
  const activeCount = allQuests.filter(q => q.status === QUEST_STATUS.ACTIVE).length;
  const completedCount = allQuests.filter(q => q.status === QUEST_STATUS.COMPLETED).length;

  document.getElementById('statusPanel').innerHTML = `
    <div><strong>阶段：</strong>${phase.name}</div>
    <div><strong>主线进度：</strong>${phase.completedCount || 0}/${phase.totalCount || 0} · ${summary.completionPercent || 0}%</div>
    <div><strong>任务统计：</strong>可接 ${availableCount} · 进行中 ${activeCount} · 已完成 ${completedCount}</div>
    <div><strong>等级：</strong>Lv.${stats.level || 1} · <strong>金币：</strong>${stats.money || 0} · <strong>体力：</strong>${stats.stamina || 0}/${stats.maxStamina || 0} · <strong>心情：</strong>${stats.mood || 0}</div>
    <div><strong>属性：</strong>📚${stats.knowledge || 0} · 🤝${stats.social || 0} · 💪${stats.physical || 0} · ⭐${stats.experience || 0}</div>
    <div><strong>时间：</strong>第${time.year || 1}学年 第${time.semester || 1}学期 第${time.week || 1}周 周${time.day || 1} ${String(time.hour || 0).padStart(2, '0')}:00</div>
    <div><strong>支线跑步：</strong>${sideProgress.runs} 次 · 连续打卡 ${sideProgress.runStreak} · 社团活动 ${sideProgress.clubActivities} · 探索 ${sideProgress.explorationVisits}</div>
  `;
}

function getCategoryClass(category) {
  const map = {
    [QUEST_CATEGORY.MAIN]: 'category-main',
    [QUEST_CATEGORY.SIDE]: 'category-side',
    [QUEST_CATEGORY.CLUB]: 'category-club',
    [QUEST_CATEGORY.RUNNING]: 'category-running',
    [QUEST_CATEGORY.EXPLORATION]: 'category-exploration',
    [QUEST_CATEGORY.ACTIVITY]: 'category-activity'
  };
  return map[category] || 'category-side';
}

function renderQuestList() {
  const container = document.getElementById('questListPanel');
  const filter = document.getElementById('categoryFilter').value;
  const allQuests = questManager.getAllQuestsWithStatus();
  const filtered = filter === 'all' ? allQuests : allQuests.filter(q => q.category === filter);

  if (filtered.length === 0) {
    container.innerHTML = '当前分类下暂无任务';
    return;
  }

  container.innerHTML = filtered.map(q => {
    const progress = q.objectiveProgress || { objectives: [] };
    const totalTarget = progress.objectives.reduce((sum, o) => sum + (o.amount || 1), 0);
    const totalCurrent = progress.objectives.reduce((sum, o) => sum + (o.current || 0), 0);
    const percent = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;
    const categoryClass = getCategoryClass(q.category);
    const selectedClass = selectedQuestId === q.id ? 'selected' : '';
    return `
      <div class="quest-card ${selectedClass}" data-id="${q.id}" onclick="window.questDebug.selectQuest('${q.id}')">
        <h3><span class="tag tag-${q.status}">${q.status}</span> <span class="${categoryClass}">${q.title}</span></h3>
        <div class="status-line">类型：${q.type} · 分类：${q.category}</div>
        <div class="status-line">阶段：${q.phase || '支线'} · 地点：${q.locationName || q.locationId || '未知'}</div>
        <div class="progress-bar"><div class="progress-fill" style="width: ${percent}%"></div></div>
        <div class="status-line">目标进度：${totalCurrent}/${totalTarget} (${percent}%)</div>
      </div>
    `;
  }).join('');
}

function renderQuestDetail() {
  const panel = document.getElementById('questDetailPanel');
  if (!selectedQuestId) {
    panel.innerHTML = '点击左侧任务卡片查看详情';
    return;
  }

  const normalized = getNormalizedQuestById(selectedQuestId);
  if (!normalized) {
    panel.innerHTML = '任务不存在';
    return;
  }

  const isMain = questManager._isMainQuest(selectedQuestId);
  const detail = isMain ? questManager.getQuestDetail(selectedQuestId) : questManager.getSideQuestDetail(selectedQuestId);
  if (!detail) {
    panel.innerHTML = '无法获取任务详情';
    return;
  }

  const progress = detail.objectiveProgress || { objectives: [] };
  const objectivesHtml = progress.objectives.map(o => {
    const current = o.current || 0;
    const amount = o.amount || 1;
    return `
      <div class="status-line">
        ${o.description || o.target || o.id}：${current}/${amount}
        <div class="progress-bar" style="margin: 4px 0;">
          <div class="progress-fill" style="width: ${Math.round((current / amount) * 100)}%"></div>
        </div>
      </div>
    `;
  }).join('') || '<div class="status-line">无目标</div>';

  const rewards = normalizeRewards(detail.rewards || {});
  const rewardParts = [];
  if (rewards.money) rewardParts.push(`💰${rewards.money}`);
  if (rewards.experience) rewardParts.push(`⭐${rewards.experience}`);
  if (rewards.knowledge) rewardParts.push(`📚${rewards.knowledge}`);
  if (rewards.social) rewardParts.push(`🤝${rewards.social}`);
  if (rewards.stamina) rewardParts.push(`💪${rewards.stamina}`);
  if (rewards.mood) rewardParts.push(`😊${rewards.mood}`);

  const location = detail.location || resolveQuestLocation(normalized._original || normalized, questManager.characterCollege);
  const npcId = detail.npcId || normalized.npcId || (normalized._original && normalized._original.dialogueId);

  panel.innerHTML = `
    <div class="detail-section">
      <h4>${detail.title || detail.name}</h4>
      <div class="status-line"><span class="tag tag-${detail.status}">${detail.status}</span> 分类：${detail.category} · 类型：${detail.type}</div>
    </div>
    <div class="detail-section">
      <h4>描述</h4>
      <div class="status-line">${detail.description || '无'}</div>
    </div>
    <div class="detail-section">
      <h4>目标</h4>
      ${objectivesHtml}
    </div>
    <div class="detail-section">
      <h4>奖励</h4>
      <div class="status-line">${rewardParts.join(' ') || '无'}</div>
    </div>
    <div class="detail-section">
      <h4>地点 / NPC / 前置</h4>
      <div class="status-line">地点：${location?.name || detail.locationName || '未知'}</div>
      <div class="status-line">NPC：${npcId || '无'}</div>
      <div class="status-line">前置：${detail.prerequisites?.length ? detail.prerequisites.join(', ') : '无'}</div>
      ${detail.missingPrerequisites?.length ? `<div class="status-line" style="color: var(--danger);">缺少前置：${detail.missingPrerequisites.join('、')}</div>` : ''}
    </div>
    <div class="detail-section">
      <button class="btn btn-success" id="btnAcceptQuest" ${detail.status !== QUEST_STATUS.AVAILABLE ? 'disabled' : ''}>接取任务</button>
      <button class="btn btn-warning" id="btnAdvanceQuest" ${detail.status !== QUEST_STATUS.ACTIVE ? 'disabled' : ''}>推进目标</button>
      <button class="btn btn-success" id="btnCompleteQuest" ${(detail.status !== QUEST_STATUS.READY_TO_COMPLETE && detail.status !== QUEST_STATUS.ACTIVE) ? 'disabled' : ''}>完成任务</button>
      <button class="btn btn-info" id="btnTrackQuest">追踪任务</button>
      <button class="btn btn-danger" id="btnResetQuest">重置当前任务状态</button>
    </div>
  `;

  bindDetailButtons();
}

function bindDetailButtons() {
  const acceptBtn = document.getElementById('btnAcceptQuest');
  if (acceptBtn) {
    acceptBtn.addEventListener('click', () => {
      acceptSelectedQuest();
    });
  }
  const advanceBtn = document.getElementById('btnAdvanceQuest');
  if (advanceBtn) {
    advanceBtn.addEventListener('click', () => {
      advanceSelectedQuest();
    });
  }
  const completeBtn = document.getElementById('btnCompleteQuest');
  if (completeBtn) {
    completeBtn.addEventListener('click', () => {
      completeSelectedQuest();
    });
  }
  const trackBtn = document.getElementById('btnTrackQuest');
  if (trackBtn) {
    trackBtn.addEventListener('click', () => {
      trackSelectedQuest();
    });
  }
  const resetBtn = document.getElementById('btnResetQuest');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetSelectedQuest();
    });
  }
}

function selectQuest(questId) {
  selectedQuestId = questId;
  selectedQuestKind = questManager._isMainQuest(questId) ? 'main' : 'side';
  renderQuestList();
  renderQuestDetail();
}

async function acceptSelectedQuest() {
  if (!selectedQuestId) return;
  const result = questManager.acceptQuest(selectedQuestId);
  logLine(result.message, result.success);
  showToast(result.message, result.success ? '#22c55e' : '#ef4444');
  refreshUI();
  return result;
}

async function advanceSelectedQuest() {
  if (!selectedQuestId) return;
  const normalized = getNormalizedQuestById(selectedQuestId);
  if (!normalized) return;
  const objectives = (normalized.objectives || []).filter(o => o.type !== 'custom_event');
  if (objectives.length === 0) {
    const custom = (normalized.objectives || []).find(o => o.type === 'custom_event');
    if (custom) {
      questManager.updateObjectiveProgress(selectedQuestId, custom.id, 1);
    }
  } else {
    const randomObjective = objectives[Math.floor(Math.random() * objectives.length)];
    const target = randomObjective.target || randomObjective.id;
    if (randomObjective.type === 'talk_to_npc') {
      questManager.reportQuestEvent({ type: 'talk_to_npc', npcId: target });
    } else if (randomObjective.type === 'visit_location') {
      questManager.reportQuestEvent({ type: 'visit_location', locationName: target });
    } else if (randomObjective.type === 'enter_scene') {
      questManager.reportQuestEvent({ type: 'enter_scene', sceneId: target });
    } else if (randomObjective.type === 'complete_dialogue') {
      questManager.reportQuestEvent({ type: 'complete_dialogue', dialogueId: target });
    } else if (randomObjective.type === 'join_club') {
      questManager.reportQuestEvent({ type: 'join_club', clubId: target });
    } else if (randomObjective.type === 'attend_activity') {
      questManager.reportQuestEvent({ type: 'attend_activity', clubId: target });
    } else if (randomObjective.type === 'run_distance') {
      questManager.reportQuestEvent({ type: 'run_distance', distance: 1 });
    } else if (randomObjective.type === 'pass_exam') {
      questManager.reportQuestEvent({ type: 'pass_exam', subject: target });
    } else if (randomObjective.type === 'collect_item') {
      questManager.reportQuestEvent({ type: 'collect_item', itemId: target });
    } else if (randomObjective.type === 'buy_item') {
      questManager.reportQuestEvent({ type: 'buy_item', itemId: target });
    } else if (randomObjective.type === 'use_item') {
      questManager.reportQuestEvent({ type: 'use_item', itemId: target });
    } else if (randomObjective.type === 'increase_stat') {
      questManager.reportQuestEvent({ type: 'increase_stat', stat: target });
    } else if (randomObjective.type === 'wait_time') {
      questManager.reportQuestEvent({ type: 'wait_time', minutes: 1 });
    } else {
      questManager.updateObjectiveProgress(selectedQuestId, randomObjective.id, 1);
    }
  }
  logLine(`已推进任务 ${selectedQuestId} 的一个目标`, true);
  refreshUI();
}

async function completeSelectedQuest() {
  if (!selectedQuestId) return;
  const normalized = getNormalizedQuestById(selectedQuestId);
  if (normalized && normalized.objectives && normalized.objectives.length > 0) {
    for (const o of normalized.objectives) {
      questManager.updateObjectiveProgress(selectedQuestId, o.id, o.amount || 1);
    }
  }
  const result = await questManager.completeQuest(selectedQuestId);
  logLine(result.message, result.success);
  showToast(result.message, result.success ? '#22c55e' : '#ef4444');
  refreshUI();
  return result;
}

function trackSelectedQuest() {
  if (!selectedQuestId) return;
  const result = questManager.setTrackedQuest(selectedQuestId, selectedQuestKind);
  logLine(result.message, result.success);
  showToast(result.message, result.success ? '#3b82f6' : '#ef4444');
  refreshUI();
  return result;
}

function resetSelectedQuest() {
  if (!selectedQuestId) return;
  const isMain = questManager._isMainQuest(selectedQuestId);
  if (isMain) {
    questManager.questStatus[selectedQuestId] = QUEST_STATUS.LOCKED;
  } else {
    questManager.sideQuestStatus[selectedQuestId] = QUEST_STATUS.LOCKED;
  }
  if (questManager.questObjectiveProgress[selectedQuestId]) {
    questManager.questObjectiveProgress[selectedQuestId] = {};
  }
  if (questManager.activeQuest === selectedQuestId) {
    questManager.activeQuest = null;
  }
  questManager._updateAllQuestStatus();
  questManager.saveProgress();
  logLine(`已重置任务 ${selectedQuestId}`, true);
  showToast('已重置当前任务状态', '#f59e0b');
  refreshUI();
  return { success: true };
}

function loadQuests() {
  questManager._updateAllQuestStatus();
  refreshUI();
  logLine('已刷新任务列表', true);
  showToast('任务列表已刷新', '#3b82f6');
}

function resetQuestSystem() {
  questManager.reset();
  selectedQuestId = null;
  refreshUI();
  logLine('任务系统已重置', true);
  showToast('任务系统已重置', '#f59e0b');
}

function exportProgress() {
  const progress = questManager.exportProgress();
  renderProgressJson();
  logLine('已导出 progress JSON', true);
  showToast('progress JSON 已更新', '#22c55e');
  return progress;
}

function addGold() {
  questManager.characterStats.money = (questManager.characterStats.money || 0) + 100;
  questManager.saveProgress();
  refreshStatus();
  logLine('金币 +100', true);
  showToast('金币 +100', '#22c55e');
}

function addKnowledge() {
  questManager.characterStats.knowledge = (questManager.characterStats.knowledge || 0) + 100;
  questManager.saveProgress();
  refreshStatus();
  logLine('知识 +100', true);
  showToast('知识 +100', '#22c55e');
}

function simNpcTalk() {
  const normalized = getNormalizedQuestById(selectedQuestId);
  const npcId = normalized?.npcId || (normalized?._original && normalized._original.dialogueId) || 'teacher_a';
  const result = questManager.reportQuestEvent({ type: 'talk_to_npc', npcId });
  logLine(`模拟 NPC 对话：${npcId}，${result.changed ? '触发任务事件' : '未触发变化'}`, true);
  refreshUI();
  return result;
}

function simPoi() {
  const normalized = getNormalizedQuestById(selectedQuestId);
  const locationName = normalized?.locationName || normalized?.locationId || '图书馆';
  const result = questManager.reportQuestEvent({ type: 'visit_location', locationName });
  logLine(`模拟 POI 触发：${locationName}，${result.changed ? '触发任务事件' : '未触发变化'}`, true);
  refreshUI();
  return result;
}

function renderTrackedQuest() {
  const panel = document.getElementById('trackedQuestPanel');
  const tracked = questManager.getTrackedQuest();
  if (!tracked) {
    panel.innerHTML = '无';
    return;
  }
  const progress = tracked.objectiveProgress || { objectives: [] };
  const totalTarget = progress.objectives.reduce((sum, o) => sum + (o.amount || 1), 0);
  const totalCurrent = progress.objectives.reduce((sum, o) => sum + (o.current || 0), 0);
  panel.innerHTML = `
    <div class="status-line"><strong>${tracked.title}</strong> <span class="tag tag-${tracked.status}">${tracked.status}</span></div>
    <div class="status-line">分类：${tracked.category} · 类型：${tracked.type}</div>
    <div class="status-line">目标进度：${totalCurrent}/${totalTarget}</div>
  `;
}

function renderProgressJson() {
  const panel = document.getElementById('progressJsonPanel');
  const progress = questManager.exportProgress();
  panel.textContent = JSON.stringify(progress, null, 2);
}

function bindToolbar() {
  document.getElementById('categoryFilter').addEventListener('change', () => {
    renderQuestList();
  });
  document.getElementById('btnLoadQuests').addEventListener('click', loadQuests);
  document.getElementById('btnResetQuestSystem').addEventListener('click', resetQuestSystem);
  document.getElementById('btnExportProgress').addEventListener('click', exportProgress);
  document.getElementById('btnAddGold').addEventListener('click', addGold);
  document.getElementById('btnAddKnowledge').addEventListener('click', addKnowledge);
  document.getElementById('btnSimNpcTalk').addEventListener('click', simNpcTalk);
  document.getElementById('btnSimPoi').addEventListener('click', simPoi);
}

window.questDebug = {
  selectQuest,
  acceptSelectedQuest,
  advanceSelectedQuest,
  completeSelectedQuest,
  trackSelectedQuest,
  resetSelectedQuest,
  loadQuests,
  resetQuestSystem,
  exportProgress,
  addGold,
  addKnowledge,
  simNpcTalk,
  simPoi,
  refreshUI
};

bindToolbar();
initDebug();
