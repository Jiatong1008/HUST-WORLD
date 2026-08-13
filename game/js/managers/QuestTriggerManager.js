/**
 * ============================================================
 * 任务触发管理器 —— 双重条件校验核心
 * ============================================================
 * 
 * 负责管理所有主线任务的触发条件：
 *   条件1：前置任务已完成
 *   条件2：玩家已到达指定任务地点
 * 
 * 两个条件同时满足时，任务状态变为 AVAILABLE，可被触发。
 *
 * 新增功能（第四阶段 4.4）：
 *   - NPC 关系值系统：getNpcRelation / adjustNpcRelation / setNpcRelation
 *   - 任务奖励关系加成：relations 数组触发关系提升，并每 10 点关系 +5% 经验/金币（上限 50%）
 *   - 毕业结局计算：computeGraduationEnding，在 graduation 任务完成后自动触发
 *   - 事件：npcRelation:changed、quest:ending、game:completed（含 ending 数据）
 */

import {
  MAIN_QUEST_CONFIG,
  QUEST_STATUS,
  QUEST_TYPE,
  QUEST_OBJECTIVE_TYPE,
  SEMESTER_PHASES,
  SIDE_QUEST_CONFIG,
  SIDE_QUEST_GROUPS,
  SIDE_QUEST_LOCATIONS,
  getAllQuests,
  getQuestById,
  getNormalizedQuestById,
  normalizeQuestConfig,
  resolveQuestLocation,
  isPlayerAtLocation,
  getTriggerDistance,
  distanceBetween,
  checkTimeRequirements,
  normalizeRewards
} from '../config/QuestTriggerConfig.js';

import { getItemById, isItemUsable, ITEM_TYPE } from '../config/ItemConfig.js';

import {
  SKILL_CONFIG,
  SKILL_LIST,
  getSkillById,
  getSkillLevelFromExp,
  getExpRequiredForSkillLevel,
  getSkillEffectValue,
  getSkillUnlockStatus
} from '../config/SkillConfig.js';

import { ACHIEVEMENTS, getAchievementById } from '../config/AchievementConfig.js';
import { getNpcById } from '../config/NpcConfig.js';

import { ErrorCode } from '../core/ErrorCode.js';

import ExamChallengeAdapter from '../combat/ExamChallengeAdapter.js';
import {
  STAT_RANGES,
  GRADE_SEMESTER_WEEK_BOUNDS,
  LEVEL_CONFIG,
  getExpRequired,
  getLevelUpRewards,
  clampStat as growthClampStat,
  clampCharacterStats as growthClampCharacterStats
} from '../config/GrowthConfig.js';

function clampStat(value, min = 0, max = 999999) {
  if (typeof value !== 'number' || Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

class QuestTriggerManager {
  constructor() {
    this.examAdapter = ExamChallengeAdapter;
    this.autoExamMode = false;
    this.autoWinExam = false;

    this.questStatus = {};
    this.completedQuests = new Set();
    this.activeQuest = null;
    this.currentPhaseIndex = 0;
    this.characterCollege = null;
    this.characterId = null;
    this.characterData = null;
    this.playerPosition = { x: 0, y: 0 };
    this.characterStats = {
      level: 1,
      experience: 0,
      knowledge: 0,
      social: 0,
      money: 0,
      stamina: 100,
      maxStamina: 100,
      mood: 50
    };
    this.proficiencies = {};
    this.unlockedSubjects = new Set();
    this.unlockedSkills = new Set();
    this.listeners = {};
    this.visitedLocations = new Set();
    this.initialized = false;
    this.gameTime = { year: 1, semester: 1, week: 1, day: 1, hour: 8 };
    this.timeSystem = null;
    this.clubTasks = [];
    this.sideQuestStatus = {};
    this.sideQuestProgress = {
      runs: 0,
      runStreak: 0,
      studyVisits: 0,
      canteenVisits: 0,
      explorationVisits: 0,
      clubActivities: 0,
      clubProjects: 0,
      labVisits: 0
    };
    this.joinedClubs = new Set();
    this.inventory = { items: {}, capacity: 99, updatedAt: null };
    this.achievements = new Set();
    this.unlockedScenes = new Set();
    this.npcDialogueHistory = new Set();
    this.npcRelations = {};
    this.ending = null;
    this.skills = { unlocked: [], entries: {}, updatedAt: null };
    this._autoSaveEnabled = true;
    this._ensureGlobal();

    this.questObjectiveProgress = {};
    this.trackedQuestId = null;
  }

  _ensureGlobal() {
    if (typeof window !== 'undefined') {
      window.questTriggerManager = this;
    }
  }
  
  setTimeSystem(timeSystem) {
    this.timeSystem = timeSystem;
    if (typeof window !== 'undefined') {
      window.timeSystem = timeSystem;
    }
  }
  
  init(characterData = null) {
    if (this.initialized) return;
    
    this._ensureGlobal();

    if (characterData) {
      this.loadFromCharacterData(characterData);
    } else {
      this._initDefaultState();
    }
    
    this._restoreFromSaveManager();
    
    this._updateAllQuestStatus();
    this.initialized = true;
    
    console.log('[QuestTriggerManager] 初始化完成');
    console.log('[QuestTriggerManager] 当前阶段:', this.getCurrentPhaseName());
    console.log('[QuestTriggerManager] 当前游戏时间:', JSON.stringify(this.gameTime));
    console.log('[QuestTriggerManager] 当前阶段任务:', this._getCurrentPhaseQuests().map(q => q.id));
  }

  _restoreFromSaveManager() {
    if (typeof window === 'undefined' || !window.saveManager) return;
    try {
      const saved = window.saveManager.loadLocal ? window.saveManager.loadLocal() : null;
      if (saved && saved.progress) {
        this.loadProgress(saved.progress, false);
      }
    } catch (error) {
      console.warn('[QuestTriggerManager] 从 SaveManager 恢复失败:', error.message);
    }
  }
  
  _consumeTime(minutes) {
    if (this.timeSystem) {
      this.timeSystem.advanceTimeByMinutes(minutes);
    } else {
      this.gameTime.minute = (this.gameTime.minute || 0) + minutes;
      while (this.gameTime.minute >= 60) {
        this.gameTime.minute -= 60;
        this.gameTime.hour++;
      }
      while (this.gameTime.hour >= 24) {
        this.gameTime.hour -= 24;
        this.gameTime.day++;
      }
      if (this.gameTime.day > 7) {
        this.gameTime.day = 1;
        this.gameTime.week++;
      }
    }
  }
  
  _getProficiencyMap() {
    const map = {};
    for (const [subject, prof] of Object.entries(this.proficiencies)) {
      map[subject] = prof && typeof prof.points === 'number' ? prof.points : 0;
    }
    return map;
  }

  loadFromCharacterData(characterData) {
    this.characterData = characterData;
    this.characterId = characterData.id || characterData.characterId || null;
    this.characterCollege = characterData.college || '计算机科学与技术学院';
    
    if (characterData.gameProgress) {
      let progress = characterData.gameProgress;
      if (typeof progress === 'string') {
        try { progress = JSON.parse(progress); } catch (e) { progress = {}; }
      }
      this.loadProgress(progress, false);
    }
    
    this.characterStats.level = characterData.level || 1;
    this.characterStats.experience = characterData.experience || 0;
    this.characterStats.money = characterData.money || characterData.gold || 0;
    this.characterStats.stamina = characterData.stamina || characterData.physical || 100;
    this.characterStats.maxStamina = characterData.maxStamina || characterData.maxStamina || 100;
    this.characterStats.mood = characterData.mood || 50;
    this.characterStats.social = characterData.social || 0;
    this.characterStats.knowledge = characterData.knowledge || 0;
  }

  loadProgress(progress = {}, updateStatus = true) {
    if (!progress) return;
    if (progress.currentPhaseIndex !== undefined) {
      this.currentPhaseIndex = clampStat(progress.currentPhaseIndex, 0, SEMESTER_PHASES.length - 1);
    }
    if (progress.activeQuest !== undefined) this.activeQuest = progress.activeQuest;
    this.completedQuests = new Set(Array.isArray(progress.completedQuests) ? progress.completedQuests : []);
    if (progress.questStatus) this.questStatus = { ...progress.questStatus };
    this.visitedLocations = new Set(Array.isArray(progress.visitedLocations) ? progress.visitedLocations : []);
    this.unlockedSubjects = new Set(Array.isArray(progress.unlockedSubjects) ? progress.unlockedSubjects : []);
    this.unlockedSkills = new Set(Array.isArray(progress.unlockedSkills) ? progress.unlockedSkills : []);
    if (progress.proficiencies) this.proficiencies = { ...progress.proficiencies };
    this.normalizeSkills(progress);
    if (progress.stats) {
      const stats = { ...progress.stats };
      if (stats.stamina === undefined && stats.physical !== undefined) {
        stats.stamina = Number(stats.physical);
      }
      this.characterStats = { ...this.characterStats, ...stats };
      this._normalizeStats();
    }
    if (progress.gameTime) this.gameTime = { ...this.gameTime, ...progress.gameTime };
    if (progress.sideQuests) {
      if (progress.sideQuests.status) this.sideQuestStatus = { ...progress.sideQuests.status };
      if (progress.sideQuests.progress) this.sideQuestProgress = { ...this.sideQuestProgress, ...progress.sideQuests.progress };
      this.joinedClubs = new Set(Array.isArray(progress.sideQuests.joinedClubs) ? progress.sideQuests.joinedClubs : []);
      this.achievements = new Set(Array.isArray(progress.sideQuests.achievements) ? progress.sideQuests.achievements : []);
      this.unlockedScenes = new Set(Array.isArray(progress.sideQuests.unlockedScenes) ? progress.sideQuests.unlockedScenes : []);
      this.npcDialogueHistory = new Set(Array.isArray(progress.sideQuests.npcDialogueHistory) ? progress.sideQuests.npcDialogueHistory : []);
    }
    this._migrateInventory(progress);
    this.unlockedScenes = new Set(Array.isArray(progress.unlockedScenes) ? progress.unlockedScenes : []);
    this.npcDialogueHistory = new Set(Array.isArray(progress.npcDialogueHistory) ? progress.npcDialogueHistory : []);
    this._migrateNpcRelations(progress.npcRelations);
    this.ending = progress.ending && typeof progress.ending === 'object' ? { ...progress.ending } : null;
    this.questObjectiveProgress = progress.questObjectiveProgress ? { ...progress.questObjectiveProgress } : {};
    if (progress.trackedQuestId !== undefined) this.trackedQuestId = progress.trackedQuestId;
    if (progress.trackedQuestKind !== undefined) this.trackedQuestKind = progress.trackedQuestKind;
    if (progress.trackedQuestGroup !== undefined) this.trackedQuestGroup = progress.trackedQuestGroup;
    if (updateStatus) {
      this._updateAllQuestStatus();
      this._updateAllSideQuestStatus();
    }
  }

  exportProgress() {
    return {
      currentPhaseIndex: this.currentPhaseIndex,
      activeQuest: this.activeQuest,
      completedQuests: Array.from(this.completedQuests),
      questStatus: { ...this.questStatus },
      visitedLocations: Array.from(this.visitedLocations),
      unlockedSubjects: Array.from(this.unlockedSubjects),
      unlockedSkills: Array.from(this.unlockedSkills),
      proficiencies: { ...this.proficiencies },
      skills: {
        unlocked: [...this.skills.unlocked],
        entries: { ...this.skills.entries },
        updatedAt: this.skills.updatedAt || Date.now()
      },
      stats: { ...this.characterStats },
      gameTime: { ...this.gameTime },
      sideQuests: {
        status: { ...this.sideQuestStatus },
        progress: { ...this.sideQuestProgress },
        joinedClubs: Array.from(this.joinedClubs),
        achievements: Array.from(this.achievements),
        unlockedScenes: Array.from(this.unlockedScenes),
        npcDialogueHistory: Array.from(this.npcDialogueHistory)
      },
      inventory: this.getInventory(),
      unlockedScenes: Array.from(this.unlockedScenes),
      npcDialogueHistory: Array.from(this.npcDialogueHistory),
      npcRelations: this.exportNpcRelations(),
      ending: this.ending,
      questObjectiveProgress: { ...this.questObjectiveProgress },
      trackedQuestId: this.trackedQuestId
    };
  }

  async saveProgress() {
    if (!this._autoSaveEnabled) return;
    if (typeof window === 'undefined' || !window.saveManager) return;
    try {
      await window.saveManager.save();
    } catch (error) {
      console.warn('[QuestTriggerManager] 保存进度失败:', error.message);
    }
  }
  
  _initDefaultState() {
    this.questStatus = {};
    this.completedQuests = new Set();
    this.activeQuest = null;
    this.currentPhaseIndex = 0;
    this.visitedLocations = new Set();
    this.unlockedSubjects = new Set();
    this.unlockedSkills = new Set();
    this.proficiencies = {};
    this.skills = { unlocked: [], entries: {}, updatedAt: null };
    this._normalizeStats();
    this.questObjectiveProgress = {};
    this.npcRelations = {};
    this.ending = null;
    this.trackedQuestId = null;
    
    for (const quest of getAllQuests()) {
      this.questStatus[quest.id] = QUEST_STATUS.LOCKED;
    }
    this._initSideQuestState();
  }

  _initSideQuestState() {
    this.sideQuestStatus = {};
    this.sideQuestProgress = {
      runs: 0,
      runStreak: 0,
      studyVisits: 0,
      canteenVisits: 0,
      explorationVisits: 0,
      clubActivities: 0,
      clubProjects: 0,
      labVisits: 0
    };
    this.joinedClubs = new Set();
    this.inventory = { items: {}, capacity: 99, updatedAt: null };
    this.achievements = new Set();
    this.unlockedScenes = new Set();
    this.npcDialogueHistory = new Set();
    this.npcRelations = {};
    for (const id of Object.keys(SIDE_QUEST_CONFIG)) {
      this.sideQuestStatus[id] = QUEST_STATUS.LOCKED;
    }
  }

  _normalizeStats() {
    this.characterStats = growthClampCharacterStats(this.characterStats);
  }

  clampCharacterStats() {
    this.characterStats = growthClampCharacterStats(this.characterStats);
  }

  getCharacterGrowthSummary() {
    const stats = this.characterStats;
    const nextExp = getExpRequired(stats.level + 1);
    return {
      level: stats.level,
      experience: stats.experience,
      expRequiredForNext: nextExp,
      expProgressPercent: nextExp <= 0 ? 100 : Math.min(100, Math.floor((stats.experience / nextExp) * 100)),
      money: stats.money,
      stamina: stats.stamina,
      maxStamina: stats.maxStamina,
      knowledge: stats.knowledge,
      social: stats.social,
      mood: stats.mood
    };
  }

  // ==================== NPC 关系系统 ====================

  /**
   * 从进度数据中迁移/恢复 NPC 关系对象。
   * 兼容旧版纯数值格式（{ npcId: number }）与新版结构化格式（{ npcId: { affinity, history } }）。
   */
  _migrateNpcRelations(saved = {}) {
    this.npcRelations = {};
    if (!saved || typeof saved !== 'object') return;
    for (const [npcId, value] of Object.entries(saved)) {
      if (value && typeof value === 'object' && typeof value.affinity === 'number') {
        this.npcRelations[npcId] = {
          affinity: clampStat(value.affinity, 0, this._getNpcMaxAffinity(npcId)),
          history: Array.isArray(value.history) ? value.history.slice(0, 50) : []
        };
      } else if (typeof value === 'number') {
        this.npcRelations[npcId] = {
          affinity: clampStat(value, 0, this._getNpcMaxAffinity(npcId)),
          history: []
        };
      }
    }
  }

  /**
   * 导出 NPC 关系对象，用于保存进度。
   */
  exportNpcRelations() {
    const result = {};
    for (const [npcId, relation] of Object.entries(this.npcRelations || {})) {
      result[npcId] = {
        affinity: relation.affinity || 0,
        history: Array.isArray(relation.history) ? relation.history.slice(0, 50) : []
      };
    }
    return result;
  }

  /**
   * 获取指定 NPC 的当前关系值与历史记录。
   * @param {string} npcId
   * @returns {{ affinity: number, history: Array }}
   */
  getNpcRelation(npcId) {
    if (!npcId) return { affinity: 0, history: [] };
    const relation = this.npcRelations[npcId];
    if (relation) return { affinity: relation.affinity || 0, history: Array.isArray(relation.history) ? relation.history : [] };
    return { affinity: 0, history: [] };
  }

  /**
   * 获取指定 NPC 的最大关系值，默认 100。
   * @param {string} npcId
   * @returns {number}
   */
  _getNpcMaxAffinity(npcId) {
    const npc = getNpcById(npcId);
    if (npc && typeof npc.maxAffinity === 'number') return npc.maxAffinity;
    return 100;
  }

  /**
   * 调整指定 NPC 的关系值并记录历史。
   * @param {string} npcId
   * @param {number} delta
   * @param {string} reason
   * @returns {{ npcId: string, before: number, after: number, delta: number, reason: string }}
   */
  adjustNpcRelation(npcId, delta, reason = 'unknown') {
    if (!npcId || typeof delta !== 'number' || Number.isNaN(delta)) {
      return { npcId, before: 0, after: 0, delta: 0, reason };
    }
    const relation = this.npcRelations[npcId] || { affinity: 0, history: [] };
    const before = relation.affinity || 0;
    const maxAffinity = this._getNpcMaxAffinity(npcId);
    const after = clampStat(before + delta, 0, maxAffinity);
    relation.affinity = after;
    relation.history = relation.history || [];
    relation.history.push({ delta, reason, time: Date.now() });
    if (relation.history.length > 50) relation.history = relation.history.slice(-50);
    this.npcRelations[npcId] = relation;
    this._notifyListeners('npcRelation:changed', { npcId, before, after, delta, reason, maxAffinity });
    this.saveProgress();
    return { npcId, before, after, delta, reason, maxAffinity };
  }

  /**
   * 直接设置指定 NPC 的关系值并记录历史。
   * @param {string} npcId
   * @param {number} value
   * @param {string} reason
   * @returns {{ npcId: string, before: number, after: number, reason: string }}
   */
  setNpcRelation(npcId, value, reason = 'unknown') {
    if (!npcId || typeof value !== 'number' || Number.isNaN(value)) {
      return { npcId, before: 0, after: 0, reason };
    }
    const relation = this.npcRelations[npcId] || { affinity: 0, history: [] };
    const before = relation.affinity || 0;
    const maxAffinity = this._getNpcMaxAffinity(npcId);
    const after = clampStat(value, 0, maxAffinity);
    relation.affinity = after;
    relation.history = relation.history || [];
    relation.history.push({ delta: after - before, reason, time: Date.now() });
    if (relation.history.length > 50) relation.history = relation.history.slice(-50);
    this.npcRelations[npcId] = relation;
    this._notifyListeners('npcRelation:changed', { npcId, before, after, delta: after - before, reason, maxAffinity });
    this.saveProgress();
    return { npcId, before, after, reason, maxAffinity };
  }

  /**
   * 获取所有 NPC 的平均关系值。
   * @returns {{ average: number, count: number, total: number }}
   */
  getAverageNpcRelation() {
    const relations = Object.values(this.npcRelations || {});
    if (relations.length === 0) return { average: 0, count: 0, total: 0 };
    const total = relations.reduce((sum, r) => sum + (r.affinity || 0), 0);
    return { average: total / relations.length, count: relations.length, total };
  }

  // ==================== NPC 关系系统结束 ====================

  applyStatChanges(changes = {}, source = 'unknown') {
    const before = { ...this.characterStats };
    const result = {
      before,
      after: {},
      changes: {},
      levelUps: [],
      messages: [],
      source
    };

    const growthStats = ['experience', 'money', 'knowledge', 'social', 'stamina', 'mood'];
    for (const key of growthStats) {
      if (typeof changes[key] === 'number') {
        const current = this.characterStats[key] ?? 0;
        const next = current + changes[key];
        this.characterStats[key] = next;
      }
    }

    this.clampCharacterStats();

    if ((changes.experience || 0) > 0) {
      const levelUpResult = this.checkLevelUp();
      result.levelUps = levelUpResult.levelUps;
      result.messages.push(...levelUpResult.messages);
    }

    const after = { ...this.characterStats };
    result.after = after;
    for (const key of growthStats) {
      if (typeof changes[key] === 'number') {
        result.changes[key] = after[key] - before[key];
      }
    }

    if (Object.keys(result.changes).length > 0 || result.levelUps.length > 0) {
      this._notifyListeners('character:growth', result);
      this._notifyListeners('character:updated', this.getCharacterData());
    }

    return result;
  }

  addExperience(amount, source = 'unknown') {
    return this.applyStatChanges({ experience: amount }, source);
  }

  checkLevelUp() {
    const result = { levelUps: [], messages: [] };
    let changed = false;

    while (this.characterStats.experience >= getExpRequired(this.characterStats.level + 1) && getExpRequired(this.characterStats.level + 1) > 0) {
      const required = getExpRequired(this.characterStats.level + 1);
      this.characterStats.experience -= required;
      this.characterStats.level += 1;
      changed = true;

      const rewards = getLevelUpRewards(this.characterStats.level, LEVEL_CONFIG);
      this.characterStats.maxStamina += rewards.maxStaminaBonus;
      this.characterStats.stamina = this.characterStats.maxStamina;

      for (const [stat, bonus] of Object.entries(rewards.statBonus)) {
        if (typeof this.characterStats[stat] === 'number') {
          this.characterStats[stat] += bonus;
        }
      }

      this.clampCharacterStats();

      result.levelUps.push({
        level: this.characterStats.level,
        maxStamina: this.characterStats.maxStamina,
        statBonus: { ...rewards.statBonus }
      });
      result.messages.push(`升级了！当前等级 ${this.characterStats.level}`);
    }

    if (changed) {
      this._notifyListeners('character:levelUp', {
        level: this.characterStats.level,
        levelUps: result.levelUps
      });
    }

    return result;
  }

  addMoney(amount, source = 'unknown') {
    return this.applyStatChanges({ money: amount }, source);
  }
  
  updateGameTime(timeData) {
    this.gameTime = { ...this.gameTime, ...timeData };
    
    console.log('[QuestTriggerManager] 游戏时间更新:', JSON.stringify(this.gameTime));
    
    this._checkLocationTriggers();
  }
  
  setGameTime(timeData) {
    this.updateGameTime(timeData);
  }

  updatePlayerPosition(x, y) {
    this.playerPosition.x = x;
    this.playerPosition.y = y;
    
    this._checkLocationTriggers();
    
    this._checkVisitedLocations(x, y);
  }
  
  _checkLocationTriggers() {
    const { x, y } = this.playerPosition;
    let changed = false;
    
    for (const quest of this._getCurrentPhaseQuests()) {
      const currentStatus = this.questStatus[quest.id];
      
      if (currentStatus === QUEST_STATUS.COMPLETED || currentStatus === QUEST_STATUS.ACTIVE || currentStatus === QUEST_STATUS.READY_TO_COMPLETE) {
        continue;
      }
      
      const timeCheck = checkTimeRequirements(quest, this.gameTime);
      
      const location = resolveQuestLocation(quest, this.characterCollege);
      if (!location) continue;
      
      const threshold = getTriggerDistance(quest.type);
      const atLocation = isPlayerAtLocation(x, y, location, threshold);
      const prereqMet = this._arePrerequisitesMet(quest);
      
      if (atLocation && timeCheck.met) {
        if (prereqMet) {
          if (currentStatus !== QUEST_STATUS.AVAILABLE) {
            this.questStatus[quest.id] = QUEST_STATUS.AVAILABLE;
            changed = true;
            this._notifyListeners('quest:available', { quest, location });
            if (quest.autoComplete) {
              this.autoCompleteQuest(quest.id);
            }
          }
        } else {
          if (currentStatus !== QUEST_STATUS.LOCATION_REACHED) {
            this.questStatus[quest.id] = QUEST_STATUS.LOCATION_REACHED;
            changed = true;
            this._notifyListeners('quest:locationReached', { quest, location });
          }
        }
      } else if (atLocation && !timeCheck.met) {
        if (currentStatus !== QUEST_STATUS.LOCATION_REACHED) {
          this.questStatus[quest.id] = QUEST_STATUS.LOCATION_REACHED;
          changed = true;
        }
      } else {
        if (currentStatus === QUEST_STATUS.AVAILABLE) {
          this.questStatus[quest.id] = QUEST_STATUS.PREREQ_MET;
          changed = true;
          this._notifyListeners('quest:leftLocation', { quest });
        } else if (currentStatus === QUEST_STATUS.LOCATION_REACHED) {
          this.questStatus[quest.id] = QUEST_STATUS.LOCKED;
          changed = true;
        } else if (!prereqMet) {
          this.questStatus[quest.id] = QUEST_STATUS.LOCKED;
          changed = true;
        }
      }
    }
    
    changed = this._checkSideQuestLocationTriggers() || changed;
    
    return changed;
  }
  
  _checkVisitedLocations(x, y) {
    if (typeof window !== 'undefined' && window._mapData) {
      const nearbyLocation = window._mapData.findLocationAt(x, y, 50);
      if (nearbyLocation && nearbyLocation.mapId) {
        this.visitedLocations.add(nearbyLocation.mapId.toString());
      }
    }
  }
  
  _arePrerequisitesMet(quest) {
    if (!quest.prerequisites || quest.prerequisites.length === 0) {
      return true;
    }
    
    for (const prereqId of quest.prerequisites) {
      if (!this.completedQuests.has(prereqId)) {
        return false;
      }
    }
    return true;
  }
  
  checkPrerequisitesDetailed(quest) {
    if (!quest.prerequisites || quest.prerequisites.length === 0) {
      return { met: true, missing: [] };
    }
    
    const missing = [];
    for (const prereqId of quest.prerequisites) {
      if (!this.completedQuests.has(prereqId)) {
        const prereq = getQuestById(prereqId);
        missing.push(prereq ? prereq.quest.name : prereqId);
      }
    }
    
    return { met: missing.length === 0, missing };
  }
  
  canActivateQuest(questId) {
    const result = getQuestById(questId);
    if (!result) return { canActivate: false, message: '任务不存在', code: ErrorCode.QUEST_NOT_FOUND.code };

    const { quest } = result;

    const status = this.questStatus[questId];
    if (status === QUEST_STATUS.COMPLETED) {
      return { canActivate: false, message: '任务已完成', code: ErrorCode.QUEST_ALREADY_COMPLETED.code };
    }
    if (status === QUEST_STATUS.ACTIVE) {
      return { canActivate: false, message: '任务已在进行中', code: ErrorCode.QUEST_ALREADY_ACTIVE.code };
    }

    const prereqCheck = this.checkPrerequisitesDetailed(quest);
    if (!prereqCheck.met) {
      return {
        canActivate: false,
        message: `前置任务未完成: ${prereqCheck.missing.join(', ')}`,
        code: ErrorCode.QUEST_PREREQ_NOT_MET.code,
        missingPrerequisites: prereqCheck.missing
      };
    }

    const timeCheck = checkTimeRequirements(quest, this.gameTime);
    if (!timeCheck.met) {
      return {
        canActivate: false,
        message: timeCheck.reason,
        code: ErrorCode.QUEST_TIME_LOCKED.code
      };
    }

    const location = resolveQuestLocation(quest, this.characterCollege);
    if (!location) {
      return {
        canActivate: false,
        message: '任务地点未配置',
        code: ErrorCode.QUEST_LOCATION_NOT_CONFIGURED.code,
        hasLocation: false
      };
    }

    const threshold = getTriggerDistance(quest.type);
    const atLocation = isPlayerAtLocation(
      this.playerPosition.x,
      this.playerPosition.y,
      location,
      threshold
    );

    if (!atLocation) {
      return {
        canActivate: false,
        message: `未到达任务地点: ${location.name || quest.locationName}`,
        code: ErrorCode.QUEST_NOT_AT_LOCATION.code,
        hasLocation: true,
        location,
        distance: distanceBetween(
          this.playerPosition.x,
          this.playerPosition.y,
          location.x,
          location.y
        )
      };
    }

    return { canActivate: true, quest, location };
  }

  tryActivateQuest(questId) {
    const checkResult = this.canActivateQuest(questId);

    if (!checkResult.canActivate) {
      return { success: false, message: checkResult.message, code: checkResult.code };
    }

    this.questStatus[questId] = QUEST_STATUS.ACTIVE;
    this.activeQuest = questId;

    const { quest } = getQuestById(questId);

    this._notifyListeners('quest:activated', { quest, location: checkResult.location });
    this.saveProgress();

    return { success: true, message: `任务 "${quest.name}" 已激活`, quest };
  }

  acceptQuest(questId) {
    const quest = getQuestById(questId)?.quest || SIDE_QUEST_CONFIG[questId];
    if (!quest) return { success: false, message: '任务不存在', code: ErrorCode.QUEST_NOT_FOUND.code };
    const status = this._getQuestStatus(questId);
    if (status === QUEST_STATUS.COMPLETED) return { success: false, message: '任务已完成', code: ErrorCode.QUEST_ALREADY_COMPLETED.code };
    if (status === QUEST_STATUS.ACTIVE) return { success: false, message: '任务已激活', code: ErrorCode.QUEST_ALREADY_ACTIVE.code };
    if (status !== QUEST_STATUS.AVAILABLE && status !== QUEST_STATUS.PREREQ_MET) {
      return { success: false, message: '任务未解锁', code: ErrorCode.QUEST_NOT_AVAILABLE.code };
    }
    if (quest.unlocksSubject) {
      this.unlockedSubjects.add(quest.unlocksSubject);
      if (!this.proficiencies[quest.unlocksSubject]) {
        this.proficiencies[quest.unlocksSubject] = { level: 1, points: 0 };
      }
    }
    this._setQuestStatus(questId, QUEST_STATUS.ACTIVE);
    this.activeQuest = questId;
    this._ensureObjectiveProgress(questId);
    this._notifyListeners(this._isMainQuest(questId) ? 'quest:activated' : 'sideQuest:activated', { quest });
    this.saveProgress();
    return { success: true, message: `任务 "${quest.name || quest.title}" 已激活`, quest };
  }

  acceptMainQuest(questId) {
    if (!getQuestById(questId)) return { success: false, message: '主线任务不存在', code: ErrorCode.QUEST_NOT_FOUND.code };
    return this.acceptQuest(questId);
  }

  acceptSideQuest(questId) {
    if (!SIDE_QUEST_CONFIG[questId]) return { success: false, message: '支线任务不存在', code: ErrorCode.QUEST_NOT_FOUND.code };
    return this.acceptQuest(questId);
  }
  
  async completeQuest(questId, options = {}) {
    const result = getQuestById(questId) || { quest: SIDE_QUEST_CONFIG[questId], phase: null };
    if (!result.quest) return { success: false, message: '任务不存在', code: ErrorCode.QUEST_NOT_FOUND.code };

    const { quest, phase } = result;
    const status = this._getQuestStatus(questId);

    if (status !== QUEST_STATUS.ACTIVE && status !== QUEST_STATUS.READY_TO_COMPLETE && !options.force) {
      return { success: false, message: '任务未在激活状态', code: ErrorCode.QUEST_NOT_ACTIVE.code };
    }

    if (quest.type === QUEST_TYPE.EXAM) {
      this.examAdapter.useBattleUI = !this.autoExamMode;
      const examResult = await this.examAdapter.runChallenge({
        subject: quest.subject || '高等数学',
        difficulty: quest.difficulty || 2,
        characterStats: this.characterStats,
        proficiency: this._getProficiencyMap(),
        autoWin: this.autoWinExam
      });

      this.examAdapter.applyResult(this.characterStats, examResult, quest.rewards || {});

      if (!examResult.success) {
        this._setQuestStatus(questId, QUEST_STATUS.AVAILABLE);
        this.activeQuest = null;
        this._notifyListeners('character:updated', this.getCharacterData());
        this.saveProgress();
        return {
          success: false,
          message: `考试失败：${examResult.message}，请提升知识和科目熟练度后再试`,
          examResult
        };
      }
    }

    return this._onQuestComplete(questId, { ...options, phase });
  }

  async _onQuestComplete(questId, options = {}) {
    const result = getQuestById(questId) || { quest: SIDE_QUEST_CONFIG[questId], phase: null };
    if (!result.quest) return { success: false, message: '任务不存在', code: ErrorCode.QUEST_NOT_FOUND.code };
    const { quest, phase } = result;
    const isMain = this._isMainQuest(questId);
    const isSide = !isMain && SIDE_QUEST_CONFIG[questId];

    let timeConsumed = 0;
    if (quest.timeCost && quest.timeCost.minutes) {
      timeConsumed = quest.timeCost.minutes;
      this._consumeTime(timeConsumed);
    }

    const wasCompleted = this.completedQuests.has(questId);

    if (quest.type !== QUEST_TYPE.REST) {
      this._setQuestStatus(questId, QUEST_STATUS.COMPLETED);
      this.completedQuests.add(questId);
    }

    if (typeof window !== 'undefined' && window.timeSystem && window.timeSystem.isTimeLocked && window.timeSystem.unlockTime) {
      if (window.timeSystem.lockRequiredQuestId === questId) {
        window.timeSystem.unlockTime();
      }
    }

    const normalizedRewards = normalizeRewards(quest.rewards || {});
    if (quest.repeatable || !wasCompleted) {
      this._grantRewards(normalizedRewards, quest);
      this._grantSkillExpByQuest(quest, `quest:${questId}`);
    }

    if (quest.unlocksSubject) {
      this.unlockedSubjects.add(quest.unlocksSubject);
      if (!this.proficiencies[quest.unlocksSubject]) {
        this.proficiencies[quest.unlocksSubject] = { level: 1, points: 0 };
      }
    }

    if (this.activeQuest === questId) {
      this.activeQuest = null;
    }

    if (isSide) {
      this._applySideQuestEffects(quest, options);
    }

    this._updateAllQuestStatus();

    const phaseAdvanced = isMain ? this._checkPhaseAdvancement() : false;

    if (questId === 'graduation' && !phaseAdvanced) {
      const ending = this.computeGraduationEnding();
      this._notifyListeners('game:completed', { quest, stats: this.getProgressSummary(), ending });
    }

    let message = `任务 "${quest.name || quest.title}" 已完成`;
    if (timeConsumed > 0) {
      if (timeConsumed >= 60) {
        const hours = Math.floor(timeConsumed / 60);
        const minutes = timeConsumed % 60;
        if (minutes > 0) {
          message += `，消耗了 ${hours}小时${minutes}分钟 游戏时间`;
        } else {
          message += `，消耗了 ${hours}小时 游戏时间`;
        }
      } else {
        message += `，消耗了 ${timeConsumed}分钟 游戏时间`;
      }
    }

    if (isMain) {
      this._notifyListeners('quest:completed', { quest, phase, timeConsumed, autoCompleted: options.auto || false });
    } else if (isSide) {
      this._notifyListeners('sideQuest:completed', { quest, autoCompleted: options.auto || false });
    }
    this._notifyListeners('character:updated', this.getCharacterData());

    this.saveProgress();
    return { success: true, message, quest, timeConsumed };
  }
  
  autoCompleteQuest(questId) {
    const result = getQuestById(questId);
    if (!result) return { success: false, message: '任务不存在', code: ErrorCode.QUEST_NOT_FOUND.code };
    
    const { quest } = result;
    
    return this._onQuestComplete(questId, { auto: true });
  }
  
  /**
   * 发放任务奖励，并应用 NPC 关系奖励及关系加成。
   * 关系加成：与对应 NPC 的关系值每 10 点额外增加 5% 经验和金币（上限 50%）。
   * @param {Object} rewards - 经 normalizeRewards 规范化后的奖励对象
   * @param {Object|null} quest - 来源任务，用于计算关系加成与记录来源
   * @returns {Object} 属性变化结果
   */
  _grantRewards(rewards, quest = null) {
    const source = quest ? `quest:${quest.id}` : (rewards.source || 'unknown');
    const statChanges = {};

    // 计算关系加成倍率（基于 rewards.relations 中首个有效 NPC 的最高关系值）
    let affinityMultiplier = 0;
    let relationBonusNpcId = null;
    if (Array.isArray(rewards.relations) && rewards.relations.length > 0) {
      for (const rel of rewards.relations) {
        if (!rel || !rel.npcId || typeof rel.affinity !== 'number') continue;
        const relation = this.getNpcRelation(rel.npcId);
        const bonus = Math.min(0.5, Math.floor(relation.affinity / 10) * 0.05);
        if (bonus > affinityMultiplier) {
          affinityMultiplier = bonus;
          relationBonusNpcId = rel.npcId;
        }
      }
    }

    const baseExperience = typeof rewards.experience === 'number' ? rewards.experience : 0;
    const baseMoney = typeof rewards.money === 'number' ? rewards.money : 0;
    const extraExperience = baseExperience > 0 ? Math.ceil(baseExperience * affinityMultiplier) : 0;
    const extraMoney = baseMoney > 0 ? Math.ceil(baseMoney * affinityMultiplier) : 0;

    if (typeof rewards.experience === 'number') statChanges.experience = rewards.experience + extraExperience;
    if (typeof rewards.knowledge === 'number') statChanges.knowledge = rewards.knowledge;
    if (typeof rewards.social === 'number') statChanges.social = rewards.social;
    if (typeof rewards.money === 'number') statChanges.money = rewards.money + extraMoney;
    if (typeof rewards.stamina === 'number') statChanges.stamina = rewards.stamina;
    if (typeof rewards.mood === 'number') statChanges.mood = rewards.mood;

    const growthResult = this.applyStatChanges(statChanges, source);

    if (extraExperience > 0 || extraMoney > 0) {
      growthResult.relationBonus = {
        npcId: relationBonusNpcId,
        multiplier: affinityMultiplier,
        extraExperience,
        extraMoney
      };
      if (typeof window !== 'undefined' && window.UIFeedback && window.UIFeedback.showToast) {
        window.UIFeedback.showToast(`关系加成：额外获得 ${extraExperience} 经验、${extraMoney} 金币`, 'success', 3000);
      }
    }

    if (Array.isArray(rewards.items)) {
      for (const itemRef of rewards.items) {
        if (!itemRef) continue;
        const isString = typeof itemRef === 'string';
        const itemId = isString ? itemRef : itemRef.itemId || itemRef.id;
        const count = isString ? 1 : (itemRef.count || itemRef.quantity || 1);
        if (itemId) this.addItem(itemId, count, source);
      }
    }

    if (Array.isArray(rewards.achievements)) {
      for (const achievementId of rewards.achievements) {
        this.unlockAchievement(achievementId, source);
      }
    }

    if (Array.isArray(rewards.relations)) {
      for (const rel of rewards.relations) {
        if (!rel || !rel.npcId || typeof rel.affinity !== 'number') continue;
        this.adjustNpcRelation(rel.npcId, rel.affinity, source);
      }
    }

    if (Array.isArray(rewards.unlockQuests)) {
      for (const questId of rewards.unlockQuests) {
        if (this.questStatus[questId] === QUEST_STATUS.LOCKED) {
          this.questStatus[questId] = QUEST_STATUS.AVAILABLE;
        }
        if (this.sideQuestStatus[questId] === QUEST_STATUS.LOCKED) {
          this.sideQuestStatus[questId] = QUEST_STATUS.AVAILABLE;
        }
      }
    }

    if (Array.isArray(rewards.unlockScenes)) {
      for (const sceneId of rewards.unlockScenes) {
        this.unlockedScenes.add(sceneId);
      }
    }

    if (Array.isArray(rewards.unlockNpcDialogues)) {
      for (const dialogueId of rewards.unlockNpcDialogues) {
        this.npcDialogueHistory.add(dialogueId);
      }
    }

    if (rewards.proficiencyGain && typeof rewards.proficiencyGain === 'object') {
      if (Array.isArray(rewards.proficiencyGain)) {
        for (const gain of rewards.proficiencyGain) {
          if (gain && gain.subject && typeof gain.amount === 'number') {
            this.addProficiency(gain.subject, gain.amount, source);
          }
        }
      } else {
        let subject = rewards.proficiencyGain.subject;
        const amount = rewards.proficiencyGain.amount || 0;
        if (subject === 'auto') {
          const unlocked = Array.from(this.unlockedSubjects);
          subject = unlocked.length > 0 ? unlocked[0] : (quest?.subject || '通用');
        }
        if (subject && typeof amount === 'number' && amount !== 0) {
          this.addProficiency(subject, amount, source);
        }
      }
    }

    if (Array.isArray(rewards.unlockSkills)) {
      for (const skillId of rewards.unlockSkills) {
        this.unlockSkill(skillId, source);
      }
    }

    this._notifyListeners('quest:rewardsGranted', { quest, rewards, growthResult });
    return growthResult;
  }

  _tryAutoUnlockSkillBySubject(subject) {
    const skillId = this._subjectToSkillId(subject);
    if (skillId && !this.skills.unlocked.includes(skillId)) {
      const status = getSkillUnlockStatus(skillId, {
        characterStats: this.characterStats,
        completedQuests: this.completedQuests,
        unlockedSkills: new Set(this.skills.unlocked),
        unlockedSubjects: this.unlockedSubjects,
        proficiencies: this.proficiencies
      });
      if (status.unlocked) {
        this.unlockSkill(skillId, 'proficiency');
      }
    }
  }

  applyItemEffects(item, quantity, source) {
    const effects = item.effects || {};
    const statChanges = {};
    const statKeys = ['stamina', 'mood', 'knowledge', 'social', 'experience', 'money'];
    for (const key of statKeys) {
      if (typeof effects[key] === 'number') {
        statChanges[key] = effects[key] * quantity;
      }
    }
    const statResult = Object.keys(statChanges).length > 0
      ? this.applyStatChanges(statChanges, source)
      : null;
    return { effects, statResult };
  }

  _addItem(itemId, count = 1) {
    return this.addItem(itemId, count, 'legacy');
  }

  _migrateInventory(progress) {
    if (progress && progress.inventory && typeof progress.inventory === 'object' && progress.inventory.items && typeof progress.inventory.items === 'object') {
      this.inventory = {
        items: { ...progress.inventory.items },
        capacity: progress.inventory.capacity || 99,
        updatedAt: progress.inventory.updatedAt || Date.now()
      };
      return;
    }
    const normalized = { items: {}, capacity: 99, updatedAt: Date.now() };
    let migrated = false;
    if (progress && typeof progress.items === 'object' && !Array.isArray(progress.items)) {
      for (const [itemId, quantity] of Object.entries(progress.items)) {
        if (Number(quantity) > 0) {
          normalized.items[itemId] = { quantity: Number(quantity), acquiredAt: Date.now() };
          migrated = true;
        }
      }
    }
    if (!migrated && progress && Array.isArray(progress.items)) {
      for (const item of progress.items) {
        if (!item) continue;
        const itemId = item.itemId || item.id;
        const quantity = item.count || item.quantity || 1;
        if (itemId && Number(quantity) > 0) {
          normalized.items[itemId] = { quantity: Number(quantity), acquiredAt: Date.now() };
          migrated = true;
        }
      }
    }
    if (!migrated && progress && progress.sideQuests && Array.isArray(progress.sideQuests.inventory)) {
      for (const itemId of progress.sideQuests.inventory) {
        const count = (progress.sideQuests.inventoryCounts && typeof progress.sideQuests.inventoryCounts[itemId] === 'number')
          ? progress.sideQuests.inventoryCounts[itemId]
          : 1;
        normalized.items[itemId] = { quantity: count, acquiredAt: Date.now() };
      }
      migrated = true;
    }
    if (!migrated && progress && typeof progress.inventoryCounts === 'object') {
      for (const [itemId, quantity] of Object.entries(progress.inventoryCounts)) {
        if (Number(quantity) > 0) {
          normalized.items[itemId] = { quantity: Number(quantity), acquiredAt: Date.now() };
        }
      }
    }
    this.inventory = normalized;
  }

  normalizeInventory(progress) {
    if (!progress || !progress.inventory || typeof progress.inventory !== 'object') {
      return { items: {}, capacity: 99, updatedAt: Date.now() };
    }
    if (progress.inventory.items && typeof progress.inventory.items === 'object') {
      return {
        items: { ...progress.inventory.items },
        capacity: progress.inventory.capacity || 99,
        updatedAt: progress.inventory.updatedAt || Date.now()
      };
    }
    return { items: {}, capacity: 99, updatedAt: Date.now() };
  }

  getInventory() {
    return { items: { ...this.inventory.items }, capacity: this.inventory.capacity || 99, updatedAt: this.inventory.updatedAt };
  }

  getInventoryItems() {
    return Object.entries(this.inventory.items)
      .filter(([, data]) => data && typeof data.quantity === 'number' && data.quantity > 0)
      .map(([itemId, data]) => ({ itemId, ...data }));
  }

  getItemQuantity(itemId) {
    const entry = this.inventory.items[itemId];
    return entry && typeof entry.quantity === 'number' ? entry.quantity : 0;
  }

  hasItem(itemId, quantity = 1) {
    return this.getItemQuantity(itemId) >= quantity;
  }

  addItem(itemId, quantity = 1, source = 'unknown') {
    if (!quantity || quantity <= 0) return { success: false, message: '数量无效', itemId, quantity };
    const item = getItemById(itemId);
    if (!item) {
      console.warn(`[QuestTriggerManager] 未知物品: ${itemId}`);
      return { success: false, message: `未知物品: ${itemId}`, itemId };
    }
    const maxStack = typeof item.maxStack === 'number' ? item.maxStack : 99;
    const existing = this.inventory.items[itemId];
    const current = existing && typeof existing.quantity === 'number' ? existing.quantity : 0;
    const toAdd = Math.min(quantity, maxStack - current);
    if (toAdd <= 0) {
      return { success: false, message: '已达最大堆叠上限', itemId, item, beforeQuantity: current, afterQuantity: current };
    }
    const now = Date.now();
    if (existing) {
      existing.quantity = current + toAdd;
      existing.updatedAt = now;
    } else {
      this.inventory.items[itemId] = { quantity: toAdd, acquiredAt: now, updatedAt: now };
    }
    this.inventory.updatedAt = now;
    this._notifyListeners('item:added', { itemId, item, count: toAdd, total: this.inventory.items[itemId].quantity, source });
    this._notifyListeners('inventory:changed', { action: 'add', itemId, item, count: toAdd, total: this.inventory.items[itemId].quantity, source, inventory: this.getInventory() });
    return { success: true, itemId, item, count: toAdd, total: this.inventory.items[itemId].quantity, source };
  }

  removeItem(itemId, quantity = 1, source = 'unknown') {
    if (!quantity || quantity <= 0) return { success: false, message: '数量无效', itemId, quantity };
    const item = getItemById(itemId);
    const existing = this.inventory.items[itemId];
    const current = existing && typeof existing.quantity === 'number' ? existing.quantity : 0;
    if (current < quantity) {
      return { success: false, message: '物品数量不足', itemId, item, beforeQuantity: current, afterQuantity: current };
    }
    const now = Date.now();
    existing.quantity = current - quantity;
    existing.updatedAt = now;
    if (existing.quantity <= 0) delete this.inventory.items[itemId];
    this.inventory.updatedAt = now;
    const afterQuantity = this.getItemQuantity(itemId);
    this._notifyListeners('item:removed', { itemId, item, count: quantity, total: afterQuantity, source });
    this._notifyListeners('inventory:changed', { action: 'remove', itemId, item, count: quantity, total: afterQuantity, source, inventory: this.getInventory() });
    return { success: true, itemId, item, count: quantity, total: afterQuantity, source };
  }

  useItem(itemId, quantity = 1, source = 'unknown') {
    if (!quantity || quantity <= 0) return { success: false, message: '数量无效', itemId, quantity };
    const item = getItemById(itemId);
    if (!item) return { success: false, message: `未知物品: ${itemId}`, itemId };
    if (!item.usable || !isItemUsable(item)) {
      return { success: false, message: '该物品无法使用', itemId, item };
    }
    const beforeQuantity = this.getItemQuantity(itemId);
    if (beforeQuantity < quantity) {
      return { success: false, message: '物品数量不足', itemId, item, beforeQuantity, afterQuantity: beforeQuantity };
    }
    const removeResult = this.removeItem(itemId, quantity, source);
    if (!removeResult.success) {
      return { success: false, message: removeResult.message, itemId, item, beforeQuantity, afterQuantity: beforeQuantity };
    }
    const { effects, statResult } = this.applyItemEffects(item, quantity, source);
    this.reportQuestEvent({ type: 'use_item', itemId, item, quantity, source });
    this._notifyListeners('item:used', { itemId, item, count: quantity, total: removeResult.total, source, effects, statResult });
    this._notifyListeners('inventory:changed', { action: 'use', itemId, item, count: quantity, total: removeResult.total, source, inventory: this.getInventory() });
    return {
      success: true,
      message: `使用了 ${item.name || itemId} x${quantity}`,
      item,
      beforeQuantity,
      afterQuantity: removeResult.total,
      effects,
      statResult
    };
  }

  grantRewards(rewards, options = {}) {
    const normalized = normalizeRewards(rewards);
    const source = options.source || 'dialogue';
    this._grantRewards(normalized, { id: options.questId || 'dialogue', ...options });
    this._notifyListeners('quest:rewardsGranted', { quest: options, rewards: normalized, source });
    this.saveProgress();
    return { success: true, rewards: normalized };
  }

  getAchievements() {
    return Array.from(this.achievements);
  }

  hasAchievement(achievementId) {
    return this.achievements.has(achievementId);
  }

  unlockAchievement(achievementId, source = 'unknown') {
    if (this.achievements.has(achievementId)) {
      return {
        success: false,
        message: ErrorCode.ACHIEVEMENT_ALREADY_UNLOCKED.message,
        code: ErrorCode.ACHIEVEMENT_ALREADY_UNLOCKED.code,
        alreadyUnlocked: true
      };
    }
    const achievement = getAchievementById(achievementId);
    if (!achievement) {
      console.warn(`[QuestTriggerManager] 未知成就: ${achievementId}`);
      return { success: false, unknown: true };
    }
    this.achievements.add(achievementId);
    this._notifyListeners('achievement:unlocked', { achievement, achievementId, source });
    if (typeof window !== 'undefined' && window.UIFeedback && window.UIFeedback.showToast) {
      window.UIFeedback.showToast(`🏆 解锁成就：${achievement.title}`, 'success', 4000);
    }
    this.saveProgress();
    return { success: true, achievement };
  }
  
  _checkProficiencyLevelUp(subject) {
    const prof = this.proficiencies[subject];
    if (!prof) return;

    const thresholds = [0, 100, 300, 600, 1000];
    let newLevel = 1;
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (prof.points >= thresholds[i]) {
        newLevel = i + 1;
        break;
      }
    }

    if (newLevel > prof.level) {
      prof.level = newLevel;
      this._notifyListeners('proficiency:levelUp', { subject, level: newLevel });
    }
  }

  _addProficiency(subject, amount, source = 'unknown') {
    if (!subject || typeof amount !== 'number' || amount === 0) return;
    if (!this.proficiencies[subject]) {
      this.proficiencies[subject] = { level: 1, points: 0 };
    }
    const prof = this.proficiencies[subject];
    prof.points = (prof.points || 0) + amount;
    this._checkProficiencyLevelUp(subject);
    this._tryAutoUnlockSkillBySubject(subject);
    this._notifyListeners('proficiency:changed', { subject, amount, points: prof.points, level: prof.level, source });
  }

  addProficiency(subject, amount, source = 'unknown') {
    this._addProficiency(subject, amount, source);
  }
  // ==================== 技能与熟练度核心接口 ====================

  normalizeSkills(progress = {}) {
    if (progress && progress.skills && typeof progress.skills === 'object') {
      this.skills = {
        unlocked: Array.isArray(progress.skills.unlocked) ? [...progress.skills.unlocked] : [],
        entries: progress.skills.entries && typeof progress.skills.entries === 'object' ? { ...progress.skills.entries } : {},
        updatedAt: progress.skills.updatedAt || Date.now()
      };
    } else {
      this.skills = { unlocked: [], entries: {}, updatedAt: Date.now() };
    }
    this._migrateSkills(progress);
    return this.skills;
  }

  _migrateSkills(progress = {}) {
    if (!progress) return;

    const unlockedFromOld = Array.isArray(progress.unlockedSkills) ? progress.unlockedSkills : [];
    for (const skillId of unlockedFromOld) {
      if (!this.skills.unlocked.includes(skillId)) {
        this.skills.unlocked.push(skillId);
      }
      if (!this.skills.entries[skillId]) {
        this.skills.entries[skillId] = { level: 1, exp: 0, unlockedAt: Date.now() };
      }
    }

    if (progress.proficiencies && typeof progress.proficiencies === 'object') {
      for (const [subject, prof] of Object.entries(progress.proficiencies)) {
        if (!prof || typeof prof !== 'object') continue;
        const skillId = this._subjectToSkillId(subject);
        if (!skillId || !SKILL_CONFIG[skillId]) continue;
        if (!this.skills.unlocked.includes(skillId)) {
          this.skills.unlocked.push(skillId);
        }
        const existing = this.skills.entries[skillId] || { level: 1, exp: 0 };
        const migratedExp = Math.max(0, (prof.points || 0) + (existing.exp || 0));
        const level = Math.max(existing.level || 1, getSkillLevelFromExp(migratedExp, SKILL_CONFIG[skillId].levelRequirements));
        this.skills.entries[skillId] = { ...existing, exp: migratedExp, level, migratedFrom: 'proficiency' };
      }
    }

    for (const skillId of this.skills.unlocked) {
      if (!this.skills.entries[skillId]) {
        this.skills.entries[skillId] = { level: 1, exp: 0, unlockedAt: Date.now() };
      }
    }
  }

  _subjectToSkillId(subject) {
    const map = {
      '高等数学': 'math_focus',
      '高等数学（二）': 'math_focus',
      '概率论': 'math_focus',
      '专业必修课1': 'library_research',
      '专业必修课2': 'library_research',
      '专业必修课3': 'library_research',
      '专业必修课4': 'library_research'
    };
    return map[subject] || null;
  }

  getSkills() {
    return SKILL_LIST.map(skill => {
      const entry = this.skills.entries[skill.id] || { level: 1, exp: 0 };
      return {
        ...skill,
        level: entry.level || 1,
        exp: entry.exp || 0,
        maxLevel: skill.maxLevel,
        unlocked: this.isSkillUnlocked(skill.id),
        nextLevelExp: this.getSkillNextLevelExp(skill.id)
      };
    });
  }

  getSkill(skillId) {
    const skill = getSkillById(skillId);
    if (!skill) return null;
    const entry = this.skills.entries[skillId] || { level: 1, exp: 0 };
    return {
      ...skill,
      level: entry.level || 1,
      exp: entry.exp || 0,
      unlocked: this.isSkillUnlocked(skillId),
      nextLevelExp: this.getSkillNextLevelExp(skillId)
    };
  }

  getSkillNextLevelExp(skillId) {
    const skill = getSkillById(skillId);
    if (!skill) return 0;
    const entry = this.skills.entries[skillId] || { level: 1, exp: 0 };
    const currentLevel = entry.level || 1;
    if (currentLevel >= skill.maxLevel) return 0;
    return getExpRequiredForSkillLevel(currentLevel + 1, skill.levelRequirements);
  }

  isSkillUnlocked(skillId) {
    if (this.skills.unlocked.includes(skillId)) return true;
    const skill = getSkillById(skillId);
    if (!skill) return false;
    const status = getSkillUnlockStatus(skillId, {
      characterStats: this.characterStats,
      completedQuests: this.completedQuests,
      unlockedSkills: new Set(this.skills.unlocked),
      unlockedSubjects: this.unlockedSubjects,
      proficiencies: this.proficiencies
    });
    return status.unlocked;
  }

  unlockSkill(skillId, source = 'unknown') {
    const skill = getSkillById(skillId);
    if (!skill) return { success: false, message: '技能不存在', skillId };
    if (this.skills.unlocked.includes(skillId)) {
      return { success: false, message: '技能已解锁', skillId, skill };
    }
    const status = getSkillUnlockStatus(skillId, {
      characterStats: this.characterStats,
      completedQuests: this.completedQuests,
      unlockedSkills: new Set(this.skills.unlocked),
      unlockedSubjects: this.unlockedSubjects,
      proficiencies: this.proficiencies
    });
    if (!status.unlocked) {
      return { success: false, message: status.reason || '未满足解锁条件', skillId, skill };
    }
    this.skills.unlocked.push(skillId);
    if (!this.skills.entries[skillId]) {
      this.skills.entries[skillId] = { level: 1, exp: 0, unlockedAt: Date.now() };
    }
    this.unlockedSkills.add(skillId);
    this.skills.updatedAt = Date.now();
    this._notifyListeners('skill:unlocked', { skillId, skill, source });
    this._notifyListeners('character:updated', this.getCharacterData());
    this.saveProgress();
    return { success: true, message: `解锁技能 ${skill.name}`, skillId, skill, source };
  }

  addSkillExp(skillId, amount, source = 'unknown') {
    const skill = getSkillById(skillId);
    if (!skill) return { success: false, message: '技能不存在', skillId };
    if (!this.skills.unlocked.includes(skillId)) {
      return { success: false, message: '技能未解锁', skillId };
    }
    if (typeof amount !== 'number' || Number.isNaN(amount)) {
      return { success: false, message: '经验值无效', skillId, amount };
    }
    const safeAmount = Math.max(0, Math.floor(amount));
    const entry = this.skills.entries[skillId] || { level: 1, exp: 0 };
    const beforeLevel = entry.level || 1;
    entry.exp = (entry.exp || 0) + safeAmount;
    entry.level = Math.min(skill.maxLevel, getSkillLevelFromExp(entry.exp, skill.levelRequirements));
    this.skills.entries[skillId] = entry;
    this.skills.updatedAt = Date.now();
    const leveledUp = entry.level > beforeLevel;
    if (leveledUp) {
      this._notifyListeners('skill:levelUp', { skillId, skill, beforeLevel, afterLevel: entry.level, source });
    }
    this._notifyListeners('skill:expChanged', { skillId, skill, amount: safeAmount, exp: entry.exp, level: entry.level, source });
    this._notifyListeners('character:updated', this.getCharacterData());
    return { success: true, skillId, skill, beforeLevel, afterLevel: entry.level, exp: entry.exp, amount: safeAmount, leveledUp, source };
  }

  canLevelUpSkill(skillId) {
    const skill = getSkillById(skillId);
    if (!skill) return false;
    const entry = this.skills.entries[skillId];
    if (!entry) return false;
    return entry.level < skill.maxLevel && entry.exp >= this.getSkillNextLevelExp(skillId);
  }

  levelUpSkill(skillId, source = 'unknown') {
    const skill = getSkillById(skillId);
    if (!skill) return { success: false, message: '技能不存在', skillId };
    if (!this.skills.unlocked.includes(skillId)) {
      return { success: false, message: '技能未解锁', skillId };
    }
    const entry = this.skills.entries[skillId] || { level: 1, exp: 0 };
    if (entry.level >= skill.maxLevel) {
      return { success: false, message: '已达到最高等级', skillId, level: entry.level };
    }
    const nextExp = this.getSkillNextLevelExp(skillId);
    if (entry.exp < nextExp) {
      return { success: false, message: '经验不足', skillId, exp: entry.exp, required: nextExp };
    }
    const beforeLevel = entry.level || 1;
    entry.level = Math.min(skill.maxLevel, beforeLevel + 1);
    this.skills.entries[skillId] = entry;
    this.skills.updatedAt = Date.now();
    this._notifyListeners('skill:levelUp', { skillId, skill, beforeLevel, afterLevel: entry.level, source });
    this._notifyListeners('character:updated', this.getCharacterData());
    this.saveProgress();
    return { success: true, skillId, skill, beforeLevel, afterLevel: entry.level, source };
  }

  getSkillEffect(effectKey) {
    let total = 0;
    for (const skillId of this.skills.unlocked) {
      const skill = getSkillById(skillId);
      if (!skill || skill.effects[effectKey] === undefined) continue;
      const entry = this.skills.entries[skillId] || { level: 1 };
      total += getSkillEffectValue(skillId, effectKey, entry.level || 1, SKILL_CONFIG);
    }
    return total;
  }

  getSkillSummary() {
    const unlocked = this.getSkills().filter(s => s.unlocked);
    const effects = {};
    for (const skill of unlocked) {
      for (const [key, base] of Object.entries(skill.effects || {})) {
        if (typeof base !== 'number') continue;
        effects[key] = (effects[key] || 0) + base * skill.level;
      }
    }
    return {
      totalUnlocked: unlocked.length,
      totalSkills: SKILL_LIST.length,
      unlockedSkills: unlocked.map(s => ({ id: s.id, name: s.name, level: s.level, exp: s.exp, maxLevel: s.maxLevel })),
      effects
    };
  }

  _grantSkillExpByQuest(quest, source = 'unknown') {
    if (!quest) return [];
    const normalized = typeof quest === 'object' && quest.id ? quest : { id: quest, type: 'side', tags: [] };
    const type = (normalized.type || normalized.category || 'side').toLowerCase();
    const tags = Array.isArray(normalized.tags) ? normalized.tags.map(t => t.toLowerCase()) : [];
    const id = normalized.id || '';
    const mappings = [
      { match: (q) => type === 'exam' || tags.includes('exam'), skillId: 'math_focus', amount: 15 },
      { match: (q) => type === 'self_study' || tags.includes('study') || tags.includes('library'), skillId: 'library_research', amount: 10 },
      { match: (q) => type === 'running' || tags.includes('running') || tags.includes('sport'), skillId: 'endurance_training', amount: 10 },
      { match: (q) => type === 'club' || tags.includes('club') || tags.includes('social'), skillId: 'club_coordination', amount: 10 },
      { match: (q) => type === 'exploration' || tags.includes('exploration'), skillId: 'campus_observation', amount: 10 },
      { match: (q) => tags.includes('lab') || id === 'explore_lab', skillId: 'lab_practice', amount: 10 }
    ];

    const results = [];
    for (const rule of mappings) {
      if (rule.match(normalized) && this.skills.unlocked.includes(rule.skillId)) {
        const result = this.addSkillExp(rule.skillId, rule.amount, source);
        if (result.success) results.push(result);
      }
    }
    return results;
  }

  _getCurrentPhaseQuests() {
    const phaseKey = SEMESTER_PHASES[this.currentPhaseIndex]?.id;
    if (!phaseKey || !MAIN_QUEST_CONFIG[phaseKey]) return [];
    return MAIN_QUEST_CONFIG[phaseKey].quests;
  }
  
  getCurrentPhaseName() {
    return SEMESTER_PHASES[this.currentPhaseIndex]?.name || '未知阶段';
  }
  
  getCurrentPhase() {
    const phase = SEMESTER_PHASES[this.currentPhaseIndex];
    const realQuests = this._getCurrentPhaseQuests().filter(q => q.type !== QUEST_TYPE.SELF_STUDY);
    return {
      ...phase,
      quests: this._getCurrentPhaseQuests(),
      completedCount: realQuests.filter(q => this.completedQuests.has(q.id)).length,
      totalCount: realQuests.length
    };
  }
  
  _checkPhaseAdvancement() {
    const currentPhase = this._getCurrentPhaseQuests();
    const completingQuest = currentPhase.find(q => q.completesPhase && this.completedQuests.has(q.id));
    if (completingQuest) {
      return this._advanceToNextPhase();
    }

    const realQuests = currentPhase.filter(q => q.type !== QUEST_TYPE.SELF_STUDY);
    if (realQuests.length === 0) return false;
    const allCompleted = realQuests.every(q => this.completedQuests.has(q.id));
    if (allCompleted) {
      return this._advanceToNextPhase();
    }
    return false;
  }
  
  _advanceToNextPhase() {
    if (this.currentPhaseIndex >= SEMESTER_PHASES.length - 1) {
      return false;
    }
    
    this.currentPhaseIndex++;
    
    this.gameTime.semester = SEMESTER_PHASES[this.currentPhaseIndex].semester;
    // 游戏内学年使用 1–4，而不是现实年份；这与 TimeSystem、时间活动和
    // 存档字段保持一致，确保四年流程中的学年限定事件可以正确触发。
    this.gameTime.year = SEMESTER_PHASES[this.currentPhaseIndex].year;
    this.gameTime.week = 1;
    this.gameTime.day = 1;

    this.characterStats.maxStamina += 10;
    this.clampCharacterStats();

    this._updateAllQuestStatus();
    
    this._notifyListeners('phase:advanced', {
      phase: SEMESTER_PHASES[this.currentPhaseIndex]
    });
    
    this.saveProgress();
    return true;
  }
  
  _updateAllQuestStatus() {
    for (const phase of Object.values(MAIN_QUEST_CONFIG)) {
      for (const quest of phase.quests) {
        if (this.completedQuests.has(quest.id)) {
          this.questStatus[quest.id] = QUEST_STATUS.COMPLETED;
        } else {
          const prereqMet = this._arePrerequisitesMet(quest);
          
          const timeCheck = checkTimeRequirements(quest, this.gameTime);
          
          const location = resolveQuestLocation(quest, this.characterCollege);
          let atLocation = false;
          if (location) {
            const threshold = getTriggerDistance(quest.type);
            atLocation = isPlayerAtLocation(
              this.playerPosition.x,
              this.playerPosition.y,
              location,
              threshold
            );
          }
          
          if (prereqMet && atLocation && timeCheck.met) {
            this.questStatus[quest.id] = QUEST_STATUS.AVAILABLE;
          } else if (prereqMet && !atLocation && timeCheck.met) {
            this.questStatus[quest.id] = QUEST_STATUS.PREREQ_MET;
          } else if (!prereqMet && atLocation && timeCheck.met) {
            this.questStatus[quest.id] = QUEST_STATUS.LOCATION_REACHED;
          } else {
            this.questStatus[quest.id] = QUEST_STATUS.LOCKED;
          }
        }
      }
    }
    this._updateAllSideQuestStatus();
  }

  _updateAllSideQuestStatus() {
    for (const quest of Object.values(SIDE_QUEST_CONFIG)) {
      const currentStatus = this.sideQuestStatus[quest.id];
      if (!currentStatus || currentStatus === QUEST_STATUS.COMPLETED) {
        if (currentStatus !== QUEST_STATUS.COMPLETED) {
          this.sideQuestStatus[quest.id] = this._computeSideQuestStatus(quest);
        }
        continue;
      }
      if (currentStatus === QUEST_STATUS.ACTIVE || currentStatus === QUEST_STATUS.READY_TO_COMPLETE) continue;
      this.sideQuestStatus[quest.id] = this._computeSideQuestStatus(quest);
    }
  }

  _computeSideQuestStatus(quest) {
    if (this.sideQuestStatus[quest.id] === QUEST_STATUS.COMPLETED) return QUEST_STATUS.COMPLETED;
    if (!this._isSideQuestUnlockedByTime(quest)) return QUEST_STATUS.LOCKED;
    if (!this._arePrerequisitesMet(quest)) return QUEST_STATUS.LOCKED;
    const location = this._resolveSideQuestLocation(quest);
    const threshold = getTriggerDistance(quest.type);
    const atLocation = location && isPlayerAtLocation(
      this.playerPosition.x,
      this.playerPosition.y,
      location,
      threshold
    );
    if (atLocation) return QUEST_STATUS.AVAILABLE;
    return QUEST_STATUS.PREREQ_MET;
  }

  _isSideQuestUnlockedByTime(quest) {
    const req = quest.sideRequirements || {};
    const year = this.gameTime.year - 2023;
    const semester = this.gameTime.semester;
    const week = this.gameTime.week || 1;
    if (req.minYear && year < req.minYear) return false;
    if (req.maxYear && year > req.maxYear) return false;
    if (req.minSemester && semester < req.minSemester) return false;
    if (req.maxSemester && semester > req.maxSemester) return false;
    if (quest.requiredYear && year < quest.requiredYear) return false;
    if (quest.requiredSemester && semester < quest.requiredSemester) return false;
    if (quest.requiredWeek && week < quest.requiredWeek) return false;
    return true;
  }

  _resolveSideQuestLocation(quest) {
    if (quest.locationName && SIDE_QUEST_LOCATIONS[quest.locationName]) {
      return { ...SIDE_QUEST_LOCATIONS[quest.locationName], name: quest.locationName };
    }
    return resolveQuestLocation(quest, this.characterCollege);
  }

  _checkSideQuestLocationTriggers() {
    let changed = false;
    for (const quest of Object.values(SIDE_QUEST_CONFIG)) {
      const currentStatus = this.sideQuestStatus[quest.id];
      if (currentStatus === QUEST_STATUS.COMPLETED || currentStatus === QUEST_STATUS.ACTIVE || currentStatus === QUEST_STATUS.READY_TO_COMPLETE) continue;
      if (!this._isSideQuestUnlockedByTime(quest) || !this._arePrerequisitesMet(quest)) continue;
      const location = this._resolveSideQuestLocation(quest);
      if (!location) continue;
      const threshold = getTriggerDistance(quest.type);
      const atLocation = isPlayerAtLocation(
        this.playerPosition.x,
        this.playerPosition.y,
        location,
        threshold
      );
      if (atLocation && currentStatus !== QUEST_STATUS.AVAILABLE) {
        this.sideQuestStatus[quest.id] = QUEST_STATUS.AVAILABLE;
        changed = true;
        this._notifyListeners('sideQuest:available', { quest, location });
      } else if (!atLocation && currentStatus === QUEST_STATUS.AVAILABLE) {
        this.sideQuestStatus[quest.id] = QUEST_STATUS.PREREQ_MET;
        changed = true;
      }
    }
    return changed;
  }

  getAvailableSideQuests() {
    return Object.values(SIDE_QUEST_CONFIG).filter(
      q => this.sideQuestStatus[q.id] === QUEST_STATUS.AVAILABLE
    );
  }

  getSideQuestsByCategory() {
    const result = { club: [], running: [], exploration: [], side: [], completed: [], all: [] };
    for (const [group, ids] of Object.entries(SIDE_QUEST_GROUPS)) {
      for (const id of ids) {
        const quest = SIDE_QUEST_CONFIG[id];
        const status = this.sideQuestStatus[id] || QUEST_STATUS.LOCKED;
        const detail = { ...quest, status, isCompleted: status === QUEST_STATUS.COMPLETED };
        if (result[group]) result[group].push(detail);
        result.all.push(detail);
        if (status === QUEST_STATUS.COMPLETED) result.completed.push(detail);
      }
    }
    return result;
  }

  tryActivateSideQuest(questId) {
    return this.acceptSideQuest(questId);
  }

  async completeSideQuest(questId, options = {}) {
    const quest = SIDE_QUEST_CONFIG[questId];
    if (!quest) return { success: false, message: '支线任务不存在' };
    const status = this.sideQuestStatus[questId];
    if (status !== QUEST_STATUS.ACTIVE && status !== QUEST_STATUS.READY_TO_COMPLETE && !options.force) {
      return { success: false, message: '支线任务未在激活状态' };
    }
    return this._onQuestComplete(questId, options);
  }

  _applySideQuestEffects(quest, options = {}) {
    const runResult = options.runResult || {};
    const clubId = options.clubId || quest.clubId || '通用社团';
    switch (quest.id) {
      case 'club_join':
        this.joinedClubs.add(clubId);
        this.achievements.add('first_club');
        break;
      case 'club_project':
        this.sideQuestProgress.clubProjects += 1;
        break;
      case 'club_leader':
        this.achievements.add('club_leader');
        break;
      case 'run_first':
      case 'run_streak_3':
      case 'run_fitness_prep':
      case 'run_fitness_test':
      case 'run_final_night':
        if (runResult.success) {
          this.sideQuestProgress.runs += 1;
          this.sideQuestProgress.runStreak += 1;
        }
        break;
      case 'explore_library_corner':
        this.sideQuestProgress.studyVisits += 1;
        break;
      case 'explore_canteen_secret':
        this.sideQuestProgress.canteenVisits += 1;
        this.addItem('校园美食券', 1, 'exploration');
        break;
      case 'explore_lab':
        this.sideQuestProgress.labVisits += 1;
        this.achievements.add('lab_visitor');
        break;
      case 'explore_graduation_route':
        this.achievements.add('graduation_tour');
        break;
      default:
        break;
    }
  }

  async debugRunSideQuestline(group, options = {}) {
    const ids = SIDE_QUEST_GROUPS[group];
    if (!ids) return { success: false, message: '未知支线链' };
    const results = [];
    const runOptions = { force: true, auto: true, runResult: { success: true }, ...options };
    for (const id of ids) {
      this.sideQuestStatus[id] = QUEST_STATUS.ACTIVE;
      const res = await this.completeSideQuest(id, runOptions);
      results.push(res);
      if (!res.success) break;
    }
    this._updateAllSideQuestStatus();
    this.saveProgress();
    return { success: true, message: `${group} 支线链已完成 ${results.length} 个任务`, results };
  }

  resetSideQuests() {
    this._initSideQuestState();
    this._updateAllSideQuestStatus();
    this._notifyListeners('sideQuest:reset', {});
    this.saveProgress();
    return { success: true, message: '支线任务进度已重置，主线进度保持不变' };
  }

  recordRun(options = {}) {
    const distance = options.distance || 1;
    let staminaCost = options.staminaCost || 5;
    const reduction = this.getSkillEffect('staminaCostReduction');
    if (reduction > 0) {
      staminaCost = Math.max(1, Math.floor(staminaCost * (1 - reduction)));
    }
    const runResult = { success: true, staminaCost, distance };
    if (this.characterStats.stamina >= staminaCost) {
      this.characterStats.stamina = clampStat(this.characterStats.stamina - staminaCost, 0, this.characterStats.maxStamina);
      this.sideQuestProgress.runs += 1;
      this.sideQuestProgress.runStreak += 1;
    } else {
      runResult.success = false;
      runResult.message = '体力不足';
      this.sideQuestProgress.runStreak = 0;
    }
    this.reportQuestEvent({ type: 'run_distance', distance, runResult });
    this._checkRunningQuestProgress(runResult);
    this._notifyListeners('running:recorded', { ...runResult, progress: this.sideQuestProgress });
    this._notifyListeners('character:updated', this.getCharacterData());
    this.saveProgress();
    return runResult;
  }

  _checkRunningQuestProgress(runResult) {
    if (!runResult.success) return;
    const runQuests = SIDE_QUEST_GROUPS.running;
    for (const id of runQuests) {
      const quest = SIDE_QUEST_CONFIG[id];
      const status = this.sideQuestStatus[id];
      if (status === QUEST_STATUS.COMPLETED || status === QUEST_STATUS.LOCKED) continue;
      const goal = quest.internalGoal || {};
      if (goal.runs && this.sideQuestProgress.runs >= goal.runs) {
        if (status !== QUEST_STATUS.ACTIVE) this.sideQuestStatus[id] = QUEST_STATUS.AVAILABLE;
      }
    }
  }

  joinClub(clubId) {
    if (!clubId) return { success: false, message: '社团ID不能为空' };
    this.joinedClubs.add(clubId);
    this.reportQuestEvent({ type: 'join_club', clubId });
    this._checkClubQuestProgress('join');
    this._notifyListeners('club:joined', { clubId, joinedClubs: Array.from(this.joinedClubs) });
    this.saveProgress();
    return { success: true, message: `已加入社团 ${clubId}` };
  }

  attendClubActivity(clubId) {
    if (!this.joinedClubs.has(clubId)) return { success: false, message: '尚未加入该社团' };
    this.sideQuestProgress.clubActivities += 1;
    const socialBonus = this.getSkillEffect('socialBonus');
    const moodBonus = this.getSkillEffect('moodGainBonus');
    if (socialBonus > 0 || moodBonus > 0) {
      this.characterStats.social = clampStat(this.characterStats.social + Math.floor(2 * (1 + socialBonus)), 0, 100);
      this.characterStats.mood = clampStat(this.characterStats.mood + Math.floor(1 * (1 + moodBonus)), 0, 100);
    }
    this.reportQuestEvent({ type: 'attend_activity', clubId });
    this._checkClubQuestProgress('activity');
    this._notifyListeners('club:activity', { clubId, count: this.sideQuestProgress.clubActivities });
    this.saveProgress();
    return { success: true, message: `参加社团 ${clubId} 活动一次` };
  }

  completeClubProject(clubId) {
    if (!this.joinedClubs.has(clubId)) return { success: false, message: '尚未加入该社团' };
    this.sideQuestProgress.clubProjects += 1;
    const socialBonus = this.getSkillEffect('socialBonus');
    const moodBonus = this.getSkillEffect('moodGainBonus');
    if (socialBonus > 0 || moodBonus > 0) {
      this.characterStats.social = clampStat(this.characterStats.social + Math.floor(3 * (1 + socialBonus)), 0, 100);
      this.characterStats.mood = clampStat(this.characterStats.mood + Math.floor(2 * (1 + moodBonus)), 0, 100);
    }
    this.reportQuestEvent({ type: 'custom_event', eventName: 'club_project', clubId });
    this._checkClubQuestProgress('project');
    this._notifyListeners('club:project', { clubId, count: this.sideQuestProgress.clubProjects });
    this.saveProgress();
    return { success: true, message: `完成社团 ${clubId} 项目一次` };
  }

  _checkClubQuestProgress(action) {
    const clubQuests = SIDE_QUEST_GROUPS.club;
    for (const id of clubQuests) {
      const status = this.sideQuestStatus[id];
      if (status === QUEST_STATUS.COMPLETED || status === QUEST_STATUS.LOCKED) continue;
      if (action === 'join' && id === 'club_join') {
        this.sideQuestStatus['club_join'] = QUEST_STATUS.AVAILABLE;
      } else if (action === 'activity' && id === 'club_first_activity') {
        this.sideQuestStatus['club_first_activity'] = QUEST_STATUS.AVAILABLE;
      } else if (action === 'project' && id === 'club_project') {
        this.sideQuestStatus['club_project'] = QUEST_STATUS.AVAILABLE;
      }
    }
  }

  takeFitnessTest() {
    const stamina = this.characterStats.stamina || 0;
    const runs = this.sideQuestProgress.runs || 0;
    const runningBonus = this.getSkillEffect('runningBonus');
    const baseRate = 0.5 + (stamina / 200) + (runs / 50) + runningBonus;
    const successRate = Math.min(0.98, baseRate);
    const success = Math.random() < successRate;
    const result = { success, rate: successRate, stamina, runs, message: success ? '体测通过' : '体测未通过' };
    if (success) {
      this.characterStats.stamina = clampStat(this.characterStats.stamina + 5, 0, this.characterStats.maxStamina);
      this.sideQuestProgress.runStreak = 0;
    }
    this.reportQuestEvent({ type: 'custom_event', eventName: 'fitness_test', result });
    this._notifyListeners('running:fitnessTest', result);
    this.saveProgress();
    return result;
  }

  exploreLocation(locationName) {
    if (!locationName) return { success: false, message: '地点名称不能为空' };
    this.visitedLocations.add(locationName);
    this.sideQuestProgress.explorationVisits += 1;
    const explorationBonus = this.getSkillEffect('explorationBonus');
    if (explorationBonus > 0) {
      const knowledgeGain = Math.floor(1 * (1 + explorationBonus));
      const moodGain = Math.floor(1 * (1 + explorationBonus));
      this.characterStats.knowledge = clampStat(this.characterStats.knowledge + knowledgeGain, 0, 100);
      this.characterStats.mood = clampStat(this.characterStats.mood + moodGain, 0, 100);
    }
    this.reportQuestEvent({ type: 'visit_location', locationName });
    this._checkExplorationQuestProgress(locationName);
    this._notifyListeners('exploration:visited', { locationName, count: this.sideQuestProgress.explorationVisits });
    this.saveProgress();
    return { success: true, message: `探索地点 ${locationName}` };
  }

  _checkExplorationQuestProgress(locationName) {
    const map = {
      '南大门': 'explore_first',
      '主图书馆': 'explore_library_corner',
      '东校区CBD': 'explore_canteen_secret',
      '引力实验室': 'explore_lab',
      '爱因斯坦广场': 'explore_graduation_route'
    };
    const questId = map[locationName];
    if (!questId) return;
    const status = this.sideQuestStatus[questId];
    if (status !== QUEST_STATUS.COMPLETED && status !== QUEST_STATUS.LOCKED) {
      this.sideQuestStatus[questId] = QUEST_STATUS.AVAILABLE;
    }
  }

  eatAtCanteen(canteenName, cost = 0) {
    this.characterStats.money = clampStat(this.characterStats.money - cost, 0, 9999999);
    this.sideQuestProgress.canteenVisits += 1;
    this.reportQuestEvent({ type: 'buy_item', itemId: 'canteen_food', canteenName, cost });
    this._notifyListeners('canteen:eat', { canteenName, cost, money: this.characterStats.money });
    this.saveProgress();
    return { success: true, message: `在 ${canteenName} 消费 ${cost} 元` };
  }

  visitLibrary() {
    this.sideQuestProgress.studyVisits += 1;
    this.reportQuestEvent({ type: 'visit_location', locationName: '主图书馆' });
    this._checkExplorationQuestProgress('主图书馆');
    this._notifyListeners('library:visit', { count: this.sideQuestProgress.studyVisits });
    this.saveProgress();
    return { success: true, message: '前往图书馆自习' };
  }

  visitLab(labName) {
    this.sideQuestProgress.labVisits += 1;
    this.reportQuestEvent({ type: 'visit_location', locationName: labName });
    this._checkExplorationQuestProgress(labName);
    this._notifyListeners('lab:visit', { labName, count: this.sideQuestProgress.labVisits });
    this.saveProgress();
    return { success: true, message: `参观实验室 ${labName}` };
  }

  getSideProgress() {
    return {
      runs: this.sideQuestProgress.runs,
      runStreak: this.sideQuestProgress.runStreak,
      studyVisits: this.sideQuestProgress.studyVisits,
      canteenVisits: this.sideQuestProgress.canteenVisits,
      explorationVisits: this.sideQuestProgress.explorationVisits,
      clubActivities: this.sideQuestProgress.clubActivities,
      clubProjects: this.sideQuestProgress.clubProjects,
      labVisits: this.sideQuestProgress.labVisits,
      joinedClubs: Array.from(this.joinedClubs),
      inventory: this.getInventory(),
      achievements: Array.from(this.achievements)
    };
  }
  
  getAvailableQuests() {
    return this._getCurrentPhaseQuests().filter(
      q => this.questStatus[q.id] === QUEST_STATUS.AVAILABLE
    );
  }
  
  setClubTasks(tasks) {
    this.clubTasks = tasks || [];
    this._notifyListeners('club:tasksUpdated', { tasks });
  }
  
  getClubTasks() {
    return this.clubTasks || [];
  }
  
  getActiveClubTasks() {
    return (this.clubTasks || []).filter(t => t.status === 'accepted' && t.status !== 'completed');
  }
  
  getPrereqMetQuests() {
    return this._getCurrentPhaseQuests().filter(
      q => this.questStatus[q.id] === QUEST_STATUS.PREREQ_MET
    );
  }
  
  getLocationReachedQuests() {
    return this._getCurrentPhaseQuests().filter(
      q => this.questStatus[q.id] === QUEST_STATUS.LOCATION_REACHED
    );
  }

  getCompletedQuests() {
    return Array.from(this.completedQuests);
  }

  getActiveQuest() {
    return this.activeQuest;
  }
  
  getProgressSummary() {
    const allQuests = getAllQuests().filter(q => q.type !== QUEST_TYPE.SELF_STUDY);
    const completedCount = getAllQuests()
      .filter(q => q.type !== QUEST_TYPE.SELF_STUDY && this.completedQuests.has(q.id)).length;
    const phaseInfo = this.getCurrentPhase();
    
    return {
      phase: phaseInfo,
      totalQuests: allQuests.length,
      completedQuests: completedCount,
      completionPercent: allQuests.length > 0 ? Math.round((completedCount / allQuests.length) * 100) : 0,
      characterLevel: this.characterStats.level,
      money: this.characterStats.money,
      stats: {
        knowledge: this.characterStats.knowledge,
        social: this.characterStats.social,
        stamina: this.characterStats.stamina,
        mood: this.characterStats.mood
      }
    };
  }
  
  /**
   * 计算毕业典礼结局。
   * 统计知识类、社交类、体能类任务完成数，结合成就数与平均 NPC 关系值，判定结局类型。
   * @returns {{ type: string, title: string, description: string, dimensions: Object, npcRelations: Object }}
   */
  computeGraduationEnding() {
    const completed = Array.from(this.completedQuests);

    const knowledgeIds = new Set([
      'math_intro', 'math_final_exam', 'second_class_math', 'math2_final_exam', 'probability_final_exam',
      'explore_lab', 'thesis_preparation', 'thesis_writing', 'thesis_defense', 'graduation'
    ]);
    const socialIds = new Set([
      'freshman_arrival', 'club_join', 'club_first_activity', 'club_project', 'internship', 'internship_prep'
    ]);
    const staminaIds = new Set([
      'military_training', 'run_first', 'run_fitness_test'
    ]);

    let knowledge = 0;
    let social = 0;
    let stamina = 0;
    for (const questId of completed) {
      if (knowledgeIds.has(questId)) knowledge += 1;
      if (socialIds.has(questId)) social += 1;
      if (staminaIds.has(questId)) stamina += 1;
    }

    const achievements = Array.from(this.achievements).length;
    const relationSummary = this.getAverageNpcRelation();
    const averageRelation = relationSummary.average;

    const dimensions = {
      knowledge: knowledge * 10,
      social: social * 10,
      stamina: stamina * 10,
      achievements,
      npcRelations: Math.round(averageRelation)
    };

    let type = 'normal';
    let title = '普通毕业生';
    let description = '你顺利完成了华科的学业，留下了属于自己的四年记忆。';

    if (dimensions.knowledge >= 50 && dimensions.social >= 50 && dimensions.stamina >= 50 && averageRelation >= 60) {
      type = 'all_round';
      title = '全能毕业生';
      description = '知识、社交、体能与关系全面发展，你是名副其实的森林大学全能毕业生。';
    } else if (dimensions.knowledge >= dimensions.social && dimensions.knowledge >= dimensions.stamina && dimensions.knowledge >= 80) {
      type = 'academic';
      title = '学术精英';
      description = '图书馆、实验室与答辩教室见证了你的钻研精神，你在学术之路上走得最远。';
    } else if (dimensions.social >= dimensions.knowledge && dimensions.social >= dimensions.stamina && dimensions.social >= 80) {
      type = 'social';
      title = '社交达人';
      description = '社团、实习与百团大战让你的社交网遍布校园，你是华科的“人脉王”。';
    } else if (dimensions.stamina >= dimensions.knowledge && dimensions.stamina >= dimensions.social && dimensions.stamina >= 80) {
      type = 'athletic';
      title = '运动健将';
      description = '军训、夜跑与体测锻造了你的体魄，你是华科操场上最亮眼的存在。';
    }

    const ending = { type, title, description, dimensions, npcRelations: relationSummary };
    this.ending = ending;
    this._notifyListeners('quest:ending', { ending });
    this.saveProgress();
    return ending;
  }

  getCharacterData() {
    return {
      characterId: this.characterId,
      college: this.characterCollege,
      level: this.characterStats.level,
      experience: this.characterStats.experience,
      money: this.characterStats.money,
      knowledge: this.characterStats.knowledge,
      social: this.characterStats.social,
      stamina: this.characterStats.stamina,
      maxStamina: this.characterStats.maxStamina,
      mood: this.characterStats.mood,
      gameProgress: {
        currentPhaseIndex: this.currentPhaseIndex,
        completedQuests: Array.from(this.completedQuests),
        proficiencies: this.proficiencies,
        unlockedSubjects: Array.from(this.unlockedSubjects),
        unlockedSkills: Array.from(this.unlockedSkills),
        visitedLocations: Array.from(this.visitedLocations),
        stats: {
          level: this.characterStats.level,
          experience: this.characterStats.experience,
          money: this.characterStats.money,
          knowledge: this.characterStats.knowledge,
          social: this.characterStats.social,
          stamina: this.characterStats.stamina,
          maxStamina: this.characterStats.maxStamina,
          mood: this.characterStats.mood
        },
        gameTime: this.gameTime,
        sideQuests: {
          status: { ...this.sideQuestStatus },
          progress: { ...this.sideQuestProgress },
          joinedClubs: Array.from(this.joinedClubs),
          inventory: this.getInventory(),
          achievements: Array.from(this.achievements),
          unlockedScenes: Array.from(this.unlockedScenes),
          npcDialogueHistory: Array.from(this.npcDialogueHistory)
        },
        unlockedScenes: Array.from(this.unlockedScenes),
        npcDialogueHistory: Array.from(this.npcDialogueHistory),
        questObjectiveProgress: { ...this.questObjectiveProgress },
        trackedQuestId: this.trackedQuestId
      }
    };
  }

  getSideQuestDetail(questId) {
    const quest = SIDE_QUEST_CONFIG[questId];
    if (!quest) return null;
    const normalized = normalizeQuestConfig(quest);
    const status = this.sideQuestStatus[questId] || QUEST_STATUS.LOCKED;
    const location = this._resolveSideQuestLocation(quest);
    const prereqCheck = this.checkPrerequisitesDetailed(quest);
    const style = this._getSideQuestStyle(quest.type);
    return {
      ...normalized,
      locationName: location?.name || quest.locationName,
      status,
      location,
      style,
      prerequisitesMet: prereqCheck.met,
      missingPrerequisites: prereqCheck.missing,
      canActivate: status === QUEST_STATUS.AVAILABLE || status === QUEST_STATUS.PREREQ_MET,
      isCompleted: status === QUEST_STATUS.COMPLETED,
      isActive: status === QUEST_STATUS.ACTIVE,
      objectiveProgress: this._getObjectiveProgress(questId)
    };
  }
  
  getQuestDetail(questId) {
    const result = getQuestById(questId);
    if (!result) return null;
    
    const { quest, phase } = result;
    const normalized = normalizeQuestConfig(quest, { phase: phase.id });
    const status = this.questStatus[questId] || QUEST_STATUS.LOCKED;
    const location = resolveQuestLocation(quest, this.characterCollege);
    const prereqCheck = this.checkPrerequisitesDetailed(quest);
    const timeCheck = checkTimeRequirements(quest, this.gameTime);
    
    let distanceToLocation = null;
    if (location) {
      distanceToLocation = distanceBetween(
        this.playerPosition.x,
        this.playerPosition.y,
        location.x,
        location.y
      );
    }
    
    return {
      ...normalized,
      locationName: location?.name || quest.locationName,
      phaseName: phase.name,
      phaseId: phase.id,
      status,
      location,
      distanceToLocation,
      prerequisitesMet: prereqCheck.met,
      missingPrerequisites: prereqCheck.missing,
      timeMet: timeCheck.met,
      timeReason: timeCheck.reason,
      canActivate: status === QUEST_STATUS.AVAILABLE,
      isCompleted: status === QUEST_STATUS.COMPLETED,
      isActive: status === QUEST_STATUS.ACTIVE,
      objectiveProgress: this._getObjectiveProgress(questId)
    };
  }

  _getSideQuestStyle(type) {
    const map = {
      [QUEST_TYPE.CLUB]: { color: '#f59e0b', icon: '⭐' },
      [QUEST_TYPE.RUNNING]: { color: '#10b981', icon: '🏃' },
      [QUEST_TYPE.EXPLORATION]: { color: '#3b82f6', icon: '🔍' },
      [QUEST_TYPE.ACTIVITY]: { color: '#ec4899', icon: '🎉' },
      [QUEST_TYPE.SIDE]: { color: '#60a5fa', icon: '📌' }
    };
    return map[type] || map[QUEST_TYPE.SIDE];
  }

  reset() {
    this._initDefaultState();
    this._updateAllQuestStatus();
    this._notifyListeners('quest:reset', {});
    this.saveProgress();
    return { success: true, message: '任务进度已重置' };
  }

  /**
   * 判断指定任务 ID 是否属于主线任务。
   * @param {string} questId
   * @returns {boolean}
   */
  _isMainQuest(questId) {
    for (const phase of Object.values(MAIN_QUEST_CONFIG)) {
      if (phase.quests.some(q => q.id === questId)) return true;
    }
    return false;
  }

  _getQuestStatus(questId) {
    if (this._isMainQuest(questId)) return this.questStatus[questId] || QUEST_STATUS.LOCKED;
    return this.sideQuestStatus[questId] || QUEST_STATUS.LOCKED;
  }

  _setQuestStatus(questId, status) {
    if (this._isMainQuest(questId)) {
      this.questStatus[questId] = status;
    } else {
      this.sideQuestStatus[questId] = status;
    }
  }

  _ensureObjectiveProgress(questId) {
    if (!this.questObjectiveProgress[questId]) {
      this.questObjectiveProgress[questId] = {};
    }
  }

  _getObjectiveProgress(questId) {
    const normalized = getNormalizedQuestById(questId) || normalizeQuestConfig(SIDE_QUEST_CONFIG[questId] || getQuestById(questId)?.quest);
    if (!normalized) return null;
    const progress = this.questObjectiveProgress[questId] || {};
    const objectives = normalized.objectives || [];
    return {
      questId,
      objectives: objectives.map(o => ({
        ...o,
        current: progress[o.id] !== undefined ? progress[o.id] : o.current
      }))
    };
  }

  reportQuestEvent(event) {
    if (!event || !event.type) return { processed: false, message: '无效事件' };
    const type = event.type;
    let changed = false;
    const allNormalized = this.getAllQuestsWithStatus();
    for (const q of allNormalized) {
      if (q.status !== QUEST_STATUS.ACTIVE) continue;
      const objectives = q.objectives || [];
      for (const obj of objectives) {
        if (!this._objectiveMatchesEvent(obj, type, event)) continue;
        const before = this.questObjectiveProgress[q.id]?.[obj.id] || 0;
        const amount = obj.amount || 1;
        const step = this._eventStep(type, event);
        const after = Math.min(amount, before + step);
        if (after > before) {
          this._ensureObjectiveProgress(q.id);
          this.questObjectiveProgress[q.id][obj.id] = after;
          changed = true;
        }
      }
      if (this.canCompleteQuest(q.id)) {
        this._setQuestStatus(q.id, QUEST_STATUS.READY_TO_COMPLETE);
        changed = true;
        this._notifyListeners('quest:readyToComplete', { questId: q.id, quest: q._original || q });
      }
    }
    if (changed) this.saveProgress();
    return { processed: true, changed };
  }

  _objectiveMatchesEvent(obj, type, event) {
    switch (obj.type) {
      case QUEST_OBJECTIVE_TYPE.TALK_TO_NPC:
        return type === 'talk_to_npc' && obj.target === (event.npcId || event.target);
      case QUEST_OBJECTIVE_TYPE.VISIT_LOCATION:
        return type === 'visit_location' && obj.target === (event.locationName || event.target);
      case QUEST_OBJECTIVE_TYPE.ENTER_SCENE:
        return type === 'enter_scene' && obj.target === (event.sceneId || event.target);
      case QUEST_OBJECTIVE_TYPE.COMPLETE_DIALOGUE:
        return type === 'complete_dialogue' && obj.target === (event.dialogueId || event.target);
      case QUEST_OBJECTIVE_TYPE.JOIN_CLUB:
        return type === 'join_club' && obj.target === (event.clubId || event.target);
      case QUEST_OBJECTIVE_TYPE.ATTEND_ACTIVITY:
        return type === 'attend_activity' && obj.target === (event.clubId || event.target);
      case QUEST_OBJECTIVE_TYPE.RUN_DISTANCE:
        return type === 'run_distance' && (event.distance || 1) > 0;
      case QUEST_OBJECTIVE_TYPE.PASS_EXAM:
        return type === 'pass_exam' && obj.target === (event.subject || event.target);
      case QUEST_OBJECTIVE_TYPE.COLLECT_ITEM:
        return type === 'collect_item' && obj.target === (event.itemId || event.target);
      case QUEST_OBJECTIVE_TYPE.BUY_ITEM:
        return type === 'buy_item' && obj.target === (event.itemId || event.target);
      case QUEST_OBJECTIVE_TYPE.USE_ITEM:
        return type === 'use_item' && obj.target === (event.itemId || event.target);
      case QUEST_OBJECTIVE_TYPE.INCREASE_STAT:
        return type === 'increase_stat' && obj.target === (event.stat || event.target);
      case QUEST_OBJECTIVE_TYPE.WAIT_TIME:
        return type === 'wait_time';
      case QUEST_OBJECTIVE_TYPE.CUSTOM_EVENT:
        return type === 'custom_event' && obj.target === (event.eventName || event.target || 'complete');
      default:
        return false;
    }
  }

  _eventStep(type, event) {
    if (type === 'run_distance') return event.distance || 1;
    if (type === 'wait_time') return event.minutes || 1;
    return 1;
  }

  updateObjectiveProgress(questId, objectiveId, amount) {
    const normalized = getNormalizedQuestById(questId);
    if (!normalized) return { success: false, message: '任务不存在' };
    const objective = (normalized.objectives || []).find(o => o.id === objectiveId);
    if (!objective) return { success: false, message: '目标不存在' };
    const status = this._getQuestStatus(questId);
    if (status !== QUEST_STATUS.ACTIVE && status !== QUEST_STATUS.READY_TO_COMPLETE) {
      return { success: false, message: '任务未激活' };
    }
    this._ensureObjectiveProgress(questId);
    const before = this.questObjectiveProgress[questId][objectiveId] || 0;
    const target = objective.amount || 1;
    const after = Math.min(target, before + amount);
    this.questObjectiveProgress[questId][objectiveId] = after;
    if (after >= target && status === QUEST_STATUS.ACTIVE) {
      this._setQuestStatus(questId, QUEST_STATUS.READY_TO_COMPLETE);
      this._notifyListeners('quest:readyToComplete', { questId, quest: normalized._original || normalized });
    }
    this.saveProgress();
    return { success: true, objectiveId, before, after, target };
  }

  canCompleteQuest(questId) {
    const normalized = getNormalizedQuestById(questId);
    if (!normalized) return false;
    const objectives = normalized.objectives || [];
    if (objectives.length === 0) return true;
    const progress = this.questObjectiveProgress[questId] || {};
    return objectives.every(o => (progress[o.id] || 0) >= (o.amount || 1));
  }

  getAllQuestsWithStatus() {
    const main = [];
    for (const phase of Object.values(MAIN_QUEST_CONFIG)) {
      for (const quest of phase.quests) {
        const normalized = normalizeQuestConfig(quest, { phase: phase.id });
        normalized.status = this.questStatus[quest.id] || QUEST_STATUS.LOCKED;
        normalized.objectiveProgress = this._getObjectiveProgress(quest.id);
        main.push(normalized);
      }
    }
    const side = [];
    for (const quest of Object.values(SIDE_QUEST_CONFIG)) {
      const normalized = normalizeQuestConfig(quest);
      normalized.status = this.sideQuestStatus[quest.id] || QUEST_STATUS.LOCKED;
      normalized.objectiveProgress = this._getObjectiveProgress(quest.id);
      side.push(normalized);
    }
    return [...main, ...side];
  }

  getTrackedQuest() {
    if (!this.trackedQuestId) return null;
    const quest = getNormalizedQuestById(this.trackedQuestId);
    if (!quest) return null;
    return {
      ...quest,
      status: this._getQuestStatus(this.trackedQuestId),
      objectiveProgress: this._getObjectiveProgress(this.trackedQuestId)
    };
  }

  setTrackedQuest(questId, kind = null) {
    if (!questId) {
      this.trackedQuestId = null;
      this.saveProgress();
      return { success: true, message: '取消追踪任务' };
    }
    const exists = getQuestById(questId) || SIDE_QUEST_CONFIG[questId];
    if (!exists) return { success: false, message: '任务不存在' };
    if (kind === 'main' && !getQuestById(questId)) {
      return { success: false, message: '不是主线任务' };
    }
    if (kind === 'side' && !SIDE_QUEST_CONFIG[questId]) {
      return { success: false, message: '不是支线任务' };
    }
    this.trackedQuestId = questId;
    this.saveProgress();
    return { success: true, questId };
  }
  
  addListener(eventType, callback) {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = [];
    }
    this.listeners[eventType].push(callback);
    return () => this.removeListener(eventType, callback);
  }
  
  removeListener(eventType, callback) {
    if (!this.listeners[eventType]) return;
    this.listeners[eventType] = this.listeners[eventType].filter(cb => cb !== callback);
  }
  
  _notifyListeners(eventType, data) {
    if (!this.listeners[eventType]) return;
    for (const callback of this.listeners[eventType]) {
      try {
        callback(data);
      } catch (e) {}
    }
  }
  
}

const questTriggerManager = new QuestTriggerManager();
export default questTriggerManager;
export { QuestTriggerManager };
