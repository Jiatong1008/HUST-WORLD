import { QuestTriggerManager } from '../../game/js/managers/QuestTriggerManager.js';
import { getExpRequired } from '../../game/js/config/GrowthConfig.js';

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

function setProgressJson() {
  const el = document.getElementById('progressJsonPanel');
  if (!el) return;
  const snapshot = window.saveManager.buildSnapshot();
  const progress = snapshot.progress || {};
  el.textContent = JSON.stringify({
    character: snapshot.character,
    stats: progress.stats,
    trackedQuestId: progress.trackedQuestId,
    items: progress.items
  }, null, 2);
}

function refreshUI() {
  const stats = questManager.characterStats;
  const summary = questManager.getCharacterGrowthSummary();

  document.getElementById('level').textContent = stats.level;
  document.getElementById('experience').textContent = `${stats.experience} / ${summary.expRequiredForNext}`;
  document.getElementById('money').textContent = stats.money;
  document.getElementById('knowledge').textContent = stats.knowledge;
  document.getElementById('social').textContent = stats.social;
  document.getElementById('stamina').textContent = `${stats.stamina} / ${stats.maxStamina}`;
  document.getElementById('mood').textContent = stats.mood;

  document.getElementById('exp-bar').style.width = `${summary.expProgressPercent}%`;
  document.getElementById('knowledge-bar').style.width = `${Math.min(100, stats.knowledge)}%`;
  document.getElementById('social-bar').style.width = `${Math.min(100, stats.social)}%`;
  document.getElementById('stamina-bar').style.width = `${stats.maxStamina ? Math.min(100, (stats.stamina / stats.maxStamina) * 100) : 0}%`;
  document.getElementById('mood-bar').style.width = `${Math.min(100, stats.mood)}%`;
  document.getElementById('level-ring').style.setProperty('--pct', summary.expProgressPercent);

  setProgressJson();
}

function bindButtons() {
  const bind = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  };
  bind('btn-add-exp', () => window.addExp100());
  bind('btn-add-money', () => window.addMoney50());
  bind('btn-add-knowledge', () => window.addKnowledge10());
  bind('btn-add-social', () => window.addSocial10());
  bind('btn-reduce-stamina', () => window.reduceStamina20());
  bind('btn-trigger-level-up', () => window.triggerMultiLevelUp());
  bind('btn-apply-package', () => window.simulateQuestRewardPackage());
  bind('btn-reset', () => window.resetGrowth());
}

window.addExp100 = function () {
  const before = questManager.characterStats.level;
  const result = questManager.addExperience(100, 'debug');
  logLine(`+100 经验: Lv.${before} -> Lv.${questManager.characterStats.level} · 经验 ${result.before.experience} -> ${result.after.experience}`, 'ok');
  if (result.levelUps.length > 0) showToast(`升级！Lv.${questManager.characterStats.level}`);
  refreshUI();
};

window.addMoney50 = function () {
  const result = questManager.applyStatChanges({ money: 50 }, 'debug');
  logLine(`+50 金币: ${result.before.money} -> ${result.after.money}`, 'ok');
  refreshUI();
};

window.addKnowledge10 = function () {
  const result = questManager.applyStatChanges({ knowledge: 10 }, 'debug');
  logLine(`+10 知识: ${result.before.knowledge} -> ${result.after.knowledge}`, 'ok');
  refreshUI();
};

window.addSocial10 = function () {
  const result = questManager.applyStatChanges({ social: 10 }, 'debug');
  logLine(`+10 社交: ${result.before.social} -> ${result.after.social}`, 'ok');
  refreshUI();
};

window.reduceStamina20 = function () {
  const result = questManager.applyStatChanges({ stamina: -20 }, 'debug');
  logLine(`-20 体能: ${result.before.stamina} -> ${result.after.stamina}`, 'ok');
  refreshUI();
};

window.triggerMultiLevelUp = function () {
  const before = questManager.characterStats.level;
  const result = questManager.addExperience(2500, 'debug');
  logLine(`连升经验: Lv.${before} -> Lv.${questManager.characterStats.level} · 升级次数 ${result.levelUps.length}`, 'ok');
  if (result.levelUps.length > 0) showToast(`连续升级 x${result.levelUps.length}！Lv.${questManager.characterStats.level}`);
  refreshUI();
};

window.simulateQuestRewardPackage = function () {
  const result = questManager.applyStatChanges({
    experience: 60,
    money: 100,
    stamina: 15,
    knowledge: 5,
    mood: 5
  }, 'quest_reward');
  logLine(`发放任务奖励包: 经验 +60 金币 +100 体能 +15 知识 +5 心情 +5`, 'ok');
  if (result.levelUps.length > 0) showToast(`升级！Lv.${questManager.characterStats.level}`);
  refreshUI();
};

function loadInitialSnapshot() {
  try {
    const raw = localStorage.getItem('hust_world_save_v1');
    if (raw) {
      return window.saveManager.normalizeSnapshot(JSON.parse(raw));
    }
  } catch (error) {
    console.warn('[GrowthDebug] local snapshot parse failed:', error.message);
  }
  return window.saveManager.loadLocal();
}

function initDebug() {
  const saved = loadInitialSnapshot();
  const savedCharacter = saved?.character || {};
  if (savedCharacter.stamina === undefined && savedCharacter.physical !== undefined) {
    savedCharacter.stamina = Number(savedCharacter.physical);
  }

  questManager.init({
    id: 'debug-growth-character',
    characterName: '调试角色',
    college: '计算机科学与技术学院',
    level: 1,
    experience: 0,
    money: 1000,
    stamina: 100,
    maxStamina: 100,
    mood: 50,
    social: 50,
    knowledge: 50,
    ...savedCharacter
  });

  if (saved && saved.progress) {
    questManager.loadProgress(saved.progress, true);
  }

  questManager.addListener('character:levelUp', (data) => {
    logLine(`升级了！当前等级 Lv.${data.level}`, 'info');
    showToast(`升级！Lv.${data.level}`);
  });
  questManager.addListener('character:growth', (data) => {
    if (data.levelUps.length > 0) return;
    const changed = Object.entries(data.changes)
      .map(([k, v]) => `${k} ${v >= 0 ? '+' : ''}${v}`)
      .join(' · ');
    logLine(`属性变化: ${changed}`, 'info');
  });
  questManager.addListener('character:updated', () => {
    refreshUI();
  });

  bindButtons();
  refreshUI();
  logLine('角色成长调试页已初始化', 'ok');
}

window.addExp50 = function () {
  const before = questManager.characterStats.level;
  const result = questManager.addExperience(50, 'debug');
  logLine(`+50 经验: Lv.${before} -> Lv.${questManager.characterStats.level} · 经验 ${result.before.experience} -> ${result.after.experience}`, 'ok');
  if (result.levelUps.length > 0) {
    showToast(`升级！Lv.${questManager.characterStats.level}`);
  }
  refreshUI();
};

window.addExp250 = function () {
  const before = questManager.characterStats.level;
  const result = questManager.addExperience(250, 'debug');
  logLine(`+250 经验: Lv.${before} -> Lv.${questManager.characterStats.level} · 经验 ${result.after.experience}`, 'ok');
  if (result.levelUps.length > 0) {
    showToast(`连续升级 x${result.levelUps.length}！Lv.${questManager.characterStats.level}`);
  }
  refreshUI();
};

window.consumeStamina20 = function () {
  const result = questManager.applyStatChanges({ stamina: -20 }, 'debug');
  logLine(`-20 体力: ${result.before.stamina} -> ${result.after.stamina}`, 'ok');
  refreshUI();
};

window.restoreMoodKnowledgeSocial = function () {
  const result = questManager.applyStatChanges({ mood: 10, knowledge: 5, social: 5 }, 'debug');
  logLine(`恢复: 心情 ${result.before.mood} -> ${result.after.mood} · 知识 ${result.before.knowledge} -> ${result.after.knowledge} · 社交 ${result.before.social} -> ${result.after.social}`, 'ok');
  refreshUI();
};

window.simulateQuestReward = function () {
  const result = questManager.applyStatChanges({
    experience: 30,
    money: 100,
    stamina: 15,
    knowledge: 5,
    mood: 5
  }, 'quest_reward');
  logLine(`模拟任务奖励: 经验 +30 金币 +100 体力 +15 知识 +5 心情 +5`, 'ok');
  if (result.levelUps.length > 0) {
    showToast(`升级！Lv.${questManager.characterStats.level}`);
  }
  refreshUI();
};

window.saveAndRefresh = function () {
  window.saveManager.save().then(() => {
    logLine('已保存到本地存档', 'ok');
    window.location.reload();
  }).catch((error) => {
    logLine(`保存失败: ${error.message}`, 'warn');
  });
};

window.resetGrowth = function () {
  questManager.characterStats = {
    level: 1,
    experience: 0,
    money: 1000,
    stamina: 100,
    maxStamina: 100,
    mood: 50,
    social: 50,
    knowledge: 50
  };
  window.saveManager.save();
  refreshUI();
  logLine('已重置成长数据', 'warn');
};

window.migrateOldPhysical = function () {
  const snapshot = window.saveManager.loadLocal() || window.saveManager.buildInitialSnapshot();
  snapshot.character.physical = 75;
  delete snapshot.character.stamina;
  delete snapshot.character.maxStamina;
  window.saveManager.saveLocal(snapshot);
  window.location.reload();
};

initDebug();
