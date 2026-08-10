import { QuestTriggerManager } from '../../game/js/managers/QuestTriggerManager.js';
import { SKILL_CONFIG } from '../../game/js/config/SkillConfig.js';

const questManager = new QuestTriggerManager();
window.questManager = questManager;

window.saveManager = window.saveManager || new window.SaveManager();

function showToast(message, color = '#FFD700') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.borderColor = color;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function logLine(text, type = 'ok') {
  const log = document.getElementById('log');
  if (!log) return;
  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  const icon = type === 'warn' ? '⚠️' : (type === 'info' ? 'ℹ️' : '✅');
  const line = document.createElement('div');
  line.className = 'log-entry';
  line.innerHTML = `<div class="log-time">${time}</div><div class="log-icon">${icon}</div><div class="log-text">${text}</div>`;
  line.style.opacity = '0';
  line.style.animation = 'fadeIn 0.3s forwards';
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

function refreshUI() {
  const summary = questManager.getSkillSummary();
  document.getElementById('examBonusValue').textContent = (summary.effects.examBonus || 0).toFixed(2);
  document.getElementById('runningBonusValue').textContent = (summary.effects.runningBonus || 0).toFixed(2);
  document.getElementById('socialBonusValue').textContent = (summary.effects.socialBonus || 0).toFixed(2);
  document.getElementById('explorationBonusValue').textContent = (summary.effects.explorationBonus || 0).toFixed(2);

  const list = document.getElementById('skillList');
  list.innerHTML = '';
  for (const skill of questManager.getSkills()) {
    const row = document.createElement('div');
    row.className = `skill-card ${skill.unlocked ? '' : 'locked'}`;
    const statusClass = skill.unlocked ? 'unlocked' : 'locked';
    const statusText = skill.unlocked ? '已解锁' : '未解锁';
    const nextExp = skill.unlocked ? questManager.getSkillNextLevelExp(skill.id) : 0;
    const expText = skill.unlocked ? `${skill.exp}${nextExp > 0 ? '/' + nextExp : '/MAX'}` : '-';
    const progressPercent = skill.unlocked && nextExp > 0 ? Math.min(100, (skill.exp / nextExp) * 100) : 0;
    row.innerHTML = `
      <div class="skill-header">
        <div class="skill-name">${skill.name}</div>
        <div class="skill-status ${statusClass}">${statusText}</div>
      </div>
      <div class="skill-level">Lv.${skill.level}/${skill.maxLevel}</div>
      <div class="progress-wrap"><div class="progress-fill" style="width:${progressPercent}%"></div></div>
      <div class="skill-exp-line">${expText}</div>
    `;
    list.appendChild(row);
  }

  const snapshot = window.saveManager.buildSnapshot();
  const progress = snapshot.progress || {};
  document.getElementById('skillsJsonPanel').textContent = JSON.stringify({
    skills: progress.skills,
    unlockedSkills: progress.unlockedSkills,
    proficiencies: progress.proficiencies
  }, null, 2);
}

function initDebug() {
  questManager.init({
    id: 'debug-skills-character',
    characterName: '调试角色',
    college: '计算机科学与技术学院',
    level: 1,
    experience: 0,
    money: 1000,
    stamina: 100,
    maxStamina: 100,
    mood: 50,
    social: 50,
    knowledge: 50
  });

  const saved = window.saveManager.loadLocal();
  if (saved && saved.progress) {
    questManager.loadProgress(saved.progress, true);
  }

  questManager.addListener('skill:unlocked', (data) => {
    logLine(`解锁技能 ${data.skill.name}`, 'info');
    showToast(`解锁 ${data.skill.name}`);
  });
  questManager.addListener('skill:levelUp', (data) => {
    logLine(`技能 ${data.skill.name} Lv.${data.beforeLevel} -> Lv.${data.afterLevel}`, 'ok');
    showToast(`${data.skill.name} 升级！`);
  });
  questManager.addListener('skill:expChanged', (data) => {
    if (!data.leveledUp) {
      logLine(`技能 ${data.skill.name} +${data.amount} 经验`, 'info');
    }
  });
  questManager.addListener('character:updated', () => {
    refreshUI();
  });

  refreshUI();
  logLine('技能与熟练度调试页已初始化', 'ok');
}

function _completeQuestForSkill(questId) {
  if (!questManager.completedQuests.has(questId)) {
    questManager.completedQuests.add(questId);
  }
  if (questManager.questStatus[questId]) {
    questManager.questStatus[questId] = 'COMPLETED';
  }
}

window.unlockMathFocus = function () {
  _completeQuestForSkill('math_intro');
  const result = questManager.unlockSkill('math_focus', 'debug');
  if (result.success) {
    logLine(`解锁 ${result.skill.name}: ${result.message}`, 'ok');
  } else {
    logLine(`解锁失败: ${result.message}`, 'warn');
  }
  refreshUI();
};

window.unlockLibraryResearch = function () {
  _completeQuestForSkill('self_study_library_1');
  const result = questManager.unlockSkill('library_research', 'debug');
  if (result.success) {
    logLine(`解锁 ${result.skill.name}: ${result.message}`, 'ok');
  } else {
    logLine(`解锁失败: ${result.message}`, 'warn');
  }
  refreshUI();
};

window.unlockEnduranceTraining = function () {
  _completeQuestForSkill('run_first');
  const result = questManager.unlockSkill('endurance_training', 'debug');
  if (result.success) {
    logLine(`解锁 ${result.skill.name}: ${result.message}`, 'ok');
  } else {
    logLine(`解锁失败: ${result.message}`, 'warn');
  }
  refreshUI();
};

window.unlockCampusObservation = function () {
  _completeQuestForSkill('explore_first');
  const result = questManager.unlockSkill('campus_observation', 'debug');
  if (result.success) {
    logLine(`解锁 ${result.skill.name}: ${result.message}`, 'ok');
  } else {
    logLine(`解锁失败: ${result.message}`, 'warn');
  }
  refreshUI();
};

window.addMathFocusExp = function () {
  if (!questManager.skills.unlocked.includes('math_focus')) {
    logLine('数学专注未解锁，先解锁再增加经验', 'warn');
    return;
  }
  const result = questManager.addSkillExp('math_focus', 100, 'debug');
  if (result.success) {
    logLine(`数学专注 +100 经验: Lv.${result.beforeLevel} -> Lv.${result.afterLevel}, exp=${result.exp}`, 'ok');
  }
  refreshUI();
};

window.levelUpMathFocus = function () {
  const result = questManager.levelUpSkill('math_focus', 'debug');
  if (result.success) {
    logLine(`数学专注升级: Lv.${result.beforeLevel} -> Lv.${result.afterLevel}`, 'ok');
  } else {
    logLine(`数学专注升级失败: ${result.message}`, 'warn');
  }
  refreshUI();
};

window.simulateStudyQuest = function () {
  const results = questManager._grantSkillExpByQuest({ id: 'debug_study', type: 'self_study', tags: ['study'] }, 'debug');
  logLine(`模拟学习类任务: ${results.length} 个技能获得经验`, 'ok');
  refreshUI();
};

window.simulateExamQuest = function () {
  const results = questManager._grantSkillExpByQuest({ id: 'debug_exam', type: 'exam', tags: ['exam'] }, 'debug');
  logLine(`模拟考试类任务: ${results.length} 个技能获得经验`, 'ok');
  refreshUI();
};

window.simulateRunQuest = function () {
  const results = questManager._grantSkillExpByQuest({ id: 'debug_run', type: 'running', tags: ['running'] }, 'debug');
  logLine(`模拟跑步类任务: ${results.length} 个技能获得经验`, 'ok');
  refreshUI();
};

window.simulateClubQuest = function () {
  const results = questManager._grantSkillExpByQuest({ id: 'debug_club', type: 'club', tags: ['club'] }, 'debug');
  logLine(`模拟社团类任务: ${results.length} 个技能获得经验`, 'ok');
  refreshUI();
};

window.simulateExploreQuest = function () {
  const results = questManager._grantSkillExpByQuest({ id: 'debug_explore', type: 'exploration', tags: ['exploration'] }, 'debug');
  logLine(`模拟探索类任务: ${results.length} 个技能获得经验`, 'ok');
  refreshUI();
};

window.showSkillSummary = function () {
  const summary = questManager.getSkillSummary();
  const lines = [];
  lines.push(`已解锁 ${summary.totalUnlocked}/${summary.totalSkills}`);
  for (const [key, value] of Object.entries(summary.effects)) {
    lines.push(`${key}: ${value.toFixed(2)}`);
  }
  logLine(`加成汇总: ${lines.join(' · ')}`, 'info');
};

window.saveAndRefresh = function () {
  window.saveManager.save().then(() => {
    logLine('已保存到本地存档', 'ok');
    window.location.reload();
  }).catch((error) => {
    logLine(`保存失败: ${error.message}`, 'warn');
  });
};

window.resetSkills = function () {
  questManager.skills = { unlocked: [], entries: {}, updatedAt: Date.now() };
  questManager.unlockedSkills.clear();
  window.saveManager.save();
  refreshUI();
  logLine('已重置技能数据', 'warn');
};

function _disableSave() {
  window._originalSave = window.saveManager.save;
  window._originalSaveLocal = window.saveManager.saveLocal;
  window._originalSaveLocalSync = window.saveManager.saveLocalSync;
  window.saveManager.save = async () => {};
  window.saveManager.saveLocal = () => {};
  window.saveManager.saveLocalSync = () => null;
}

function _restoreSave() {
  if (window._originalSave) window.saveManager.save = window._originalSave;
  if (window._originalSaveLocal) window.saveManager.saveLocal = window._originalSaveLocal;
  if (window._originalSaveLocalSync) window.saveManager.saveLocalSync = window._originalSaveLocalSync;
}

window.migrateOldUnlockedSkills = function () {
  _disableSave();
  const snapshot = window.saveManager.loadLocal() || window.saveManager.buildInitialSnapshot();
  snapshot.progress.unlockedSkills = ['math_focus', 'library_research', 'endurance_training'];
  delete snapshot.progress.skills;
  window.localStorage.setItem('hust_world_save_v1', JSON.stringify(snapshot));
  _restoreSave();
  window.location.reload();
};

window.migrateOldProficiencies = function () {
  _disableSave();
  const snapshot = window.saveManager.loadLocal() || window.saveManager.buildInitialSnapshot();
  snapshot.progress.proficiencies = {
    '高等数学': { level: 3, points: 350 },
    '专业必修课1': { level: 2, points: 150 }
  };
  delete snapshot.progress.skills;
  delete snapshot.progress.unlockedSkills;
  window.localStorage.setItem('hust_world_save_v1', JSON.stringify(snapshot));
  _restoreSave();
  window.location.reload();
};

initDebug();
