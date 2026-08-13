(function (global) {
  const SAVE_KEY = 'hust_world_save_v1';
  const BACKUP_KEY = 'hust_world_save_v1_backup_old_keys';
  const OLD_KEYS = [
    'hust_world_character',
    'hust_world_time',
    'hust_world_module_clubs',
    'hust_world_module_exploration'
  ];
  const SAVE_VERSION = '1';
  const DEFAULT_INTERVAL_MS = 60 * 1000;
  // 地图的唯一默认出生点：华中科技大学南大门。
  // 旧版本曾把 (0, 0) 写进本地存档；该坐标位于地图边缘，
  // 会导致镜头看起来停在整个画布左上角，因此统一迁移到这里。
  const SOUTH_GATE_SPAWN = Object.freeze({ mapId: 24, x: 2526, y: 2773 });
  const MAP_BOUNDS = Object.freeze({ width: 8000, height: 4000 });

  function normalizeMapPosition(position) {
    const raw = position || {};
    const x = Number(raw.x);
    const y = Number(raw.y);
    const mapId = Number(raw.mapId ?? raw.map_id);
    const isOutsideMap = !Number.isFinite(x) || !Number.isFinite(y)
      || x < 0 || y < 0 || x > MAP_BOUNDS.width || y > MAP_BOUNDS.height;
    const isLegacyOrigin = x === 0 && y === 0;

    if (isOutsideMap || isLegacyOrigin) {
      return { ...SOUTH_GATE_SPAWN };
    }

    return {
      mapId: Number.isFinite(mapId) && mapId > 0 ? Math.round(mapId) : SOUTH_GATE_SPAWN.mapId,
      x: Math.round(x),
      y: Math.round(y)
    };
  }

  class SaveManager {
    constructor() {
      this.autoSaveTimer = null;
      this.lastSavedAt = null;
      this.migrationAttempted = false;
      this.ensureApiAvailable();
    }

    ensureApiAvailable() {
      if (typeof global !== 'undefined' && typeof global.API === 'undefined' && typeof require !== 'undefined') {
        try {
          global.API = require('./api.js');
        } catch (error) {
          // 浏览器环境下 api.js 通过 script 标签注入
        }
      }
    }

    getMode() {
      return this.isLoggedIn() ? 'loggedIn' : 'guest';
    }

    isLoggedIn() {
      return !!this.getToken() && !!this.getCharacterId();
    }

    getToken() {
      if (typeof sessionManager !== 'undefined') {
        return sessionManager.getToken();
      }
      if (typeof localStorage === 'undefined') return null;
      const token = localStorage.getItem('hust_world_token');
      return token && token !== 'null' && token !== 'undefined' ? token : null;
    }

    getCharacterId() {
      if (typeof sessionManager !== 'undefined') {
        const id = sessionManager.getCurrentCharacterId();
        if (id) return id;
      }
      const char = this.getCurrentCharacter();
      return char ? char.characterId || char.character_id || char.id : null;
    }

    getCurrentCharacter() {
      if (typeof window === 'undefined') return null;
      if (typeof sessionManager !== 'undefined') {
        const current = sessionManager.getCurrentCharacter();
        if (current) return current;
      }
      if (window.fusionSystem && window.fusionSystem.characterData) {
        return window.fusionSystem.characterData;
      }
      if (window.questTriggerManager && window.questTriggerManager.characterData) {
        return window.questTriggerManager.characterData;
      }
      return window._character || null;
    }

    async load() {
      this.ensureMigration();
      let snapshot = null;
      if (this.isLoggedIn()) {
        try {
          snapshot = await this.loadRemote();
        } catch (error) {
          console.warn('[SaveManager] 远程加载失败，降级到本地存档:', error.message);
          snapshot = this.loadLocal();
        }
      } else {
        snapshot = this.loadLocal();
      }
      if (snapshot && snapshot.progress) {
        // 远程存档也缓存到本地，使附加模块能够通过统一读取入口恢复进度。
        // 网络暂时不可用时，下一次打开仍可回退到这份最近的快照。
        this.saveLocal(snapshot);
        this.applyProgress(snapshot.progress);
      }
      return snapshot;
    }

    async save(snapshot = null) {
      const data = snapshot || this.buildSnapshot();
      this.lastSavedAt = data.savedAt || new Date().toISOString();

      if (this.isLoggedIn()) {
        try {
          await this.saveRemote(data);
        } catch (error) {
          console.warn('[SaveManager] 远程保存失败，降级到本地存储:', error.message);
          this.saveLocal(data);
        }
      } else {
        this.saveLocal(data);
      }
      return data;
    }

    loadLocal() {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        return this.normalizeSnapshot(parsed);
      } catch (error) {
        console.warn('[SaveManager] 本地存档解析失败:', error.message);
        return null;
      }
    }

    saveLocal(snapshot) {
      if (typeof localStorage === 'undefined') return;
      const data = this.normalizeSnapshot(snapshot);
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    }

    resetLocal() {
      if (typeof localStorage === 'undefined') return;
      localStorage.removeItem(SAVE_KEY);
    }

    async loadRemote() {
      const characterId = this.getCharacterId();
      const API = this._getApi();
      if (!characterId || !API || !API.getCharacterSave) {
        throw new Error('无法加载远程存档：缺少角色 ID 或 API 不可用');
      }
      const result = await API.getCharacterSave(characterId);
      return this.normalizeSnapshot(result);
    }

    async saveRemote(snapshot) {
      const characterId = this.getCharacterId();
      const API = this._getApi();
      if (!characterId || !API || !API.updateCharacterSave) {
        throw new Error('无法保存远程存档：缺少角色 ID 或 API 不可用');
      }
      const payload = this.snapshotToRemotePayload(snapshot);
      await API.updateCharacterSave(characterId, payload);
    }

    async resetRemote() {
      const characterId = this.getCharacterId();
      const API = this._getApi();
      if (!characterId || !API || !API.resetCharacterSave) {
        throw new Error('无法重置远程存档：缺少角色 ID 或 API 不可用');
      }
      await API.resetCharacterSave(characterId);
    }

    _getApi() {
      if (typeof global !== 'undefined' && global.API) return global.API;
      if (typeof window !== 'undefined' && window.API) return window.API;
      return null;
    }

    async reset() {
      this.stopAutoSave();
      if (this.isLoggedIn()) {
        try {
          await this.resetRemote();
        } catch (error) {
          console.warn('[SaveManager] 远程重置失败，降级到本地重置:', error.message);
        }
      }
      this.resetLocal();
      const fresh = this.buildInitialSnapshot();
      this.saveLocal(fresh);
      return fresh;
    }

    saveLocalSync() {
      try {
        const snapshot = this.buildSnapshot();
        this.saveLocal(snapshot);
        return snapshot;
      } catch (error) {
        console.warn('[SaveManager] 同步本地保存失败:', error.message);
        return null;
      }
    }

    startAutoSave(intervalMs = DEFAULT_INTERVAL_MS) {
      this.stopAutoSave();
      this.autoSaveTimer = setInterval(() => {
        this.save().catch((error) => {
          console.warn('[SaveManager] 自动保存失败:', error.message);
        });
      }, intervalMs);
    }

    stopAutoSave() {
      if (this.autoSaveTimer) {
        clearInterval(this.autoSaveTimer);
        this.autoSaveTimer = null;
      }
    }

    buildSnapshot() {
      const character = this.getCurrentCharacter() || {};
      let qmStats = null;
      if (typeof window !== 'undefined' && window.questTriggerManager && window.questTriggerManager.characterStats) {
        qmStats = window.questTriggerManager.characterStats;
      }
      const position = this.capturePosition();
      const gameTime = this.captureGameTime();
      const progress = this.captureProgress();
      const modules = this.captureModules();
      const settings = this.captureSettings();

      return this.normalizeSnapshot({
        version: SAVE_VERSION,
        savedAt: new Date().toISOString(),
        mode: this.getMode(),
        character: {
          characterId: character.characterId || character.character_id || character.id || null,
          characterName: character.characterName || character.name || '游客',
          gender: character.gender || 'unknown',
          college: character.college || '未知学院',
          level: qmStats ? Number(qmStats.level) : (Number(character.level) || 1),
          experience: qmStats ? Number(qmStats.experience) : (Number(character.experience) || 0),
          money: qmStats ? Number(qmStats.money) : (Number(character.money) || 1000),
          stamina: qmStats ? Number(qmStats.stamina) : (Number(character.stamina) || Number(character.physical) || 50),
          maxStamina: qmStats ? Number(qmStats.maxStamina) : (Number(character.maxStamina) || 100),
          social: qmStats ? Number(qmStats.social) : (Number(character.social) || 50),
          knowledge: qmStats ? Number(qmStats.knowledge) : (Number(character.knowledge) || 50),
          mood: qmStats ? Number(qmStats.mood) : (Number(character.mood) || 50),
          grade: Number(character.grade) || 1,
          semester: Number(character.semester) || 1,
          week: Number(character.week) || 1
        },
        gameTime,
        position,
        progress,
        modules,
        settings
      });
    }

    buildInitialSnapshot() {
      return this.normalizeSnapshot({
        version: SAVE_VERSION,
        savedAt: new Date().toISOString(),
        mode: this.getMode(),
        character: {
          characterId: null,
          characterName: '游客',
          gender: 'unknown',
          college: '未知学院',
          level: 1,
          experience: 0,
          money: 1000,
          stamina: 50,
          social: 50,
          knowledge: 50,
          mood: 50,
          grade: 1,
          semester: 1,
          week: 1
        },
        gameTime: { day: 1, hour: 8, minute: 0 },
        position: { ...SOUTH_GATE_SPAWN },
        progress: {},
        modules: {},
        settings: {}
      });
    }

    capturePosition() {
      let mapId = SOUTH_GATE_SPAWN.mapId;
      let x = SOUTH_GATE_SPAWN.x;
      let y = SOUTH_GATE_SPAWN.y;

      if (typeof window !== 'undefined') {
        if (window._character) {
          x = Number(window._character.x);
          y = Number(window._character.y);
        }
        if (window.currentMapId !== undefined) {
          mapId = Number(window.currentMapId) || SOUTH_GATE_SPAWN.mapId;
        } else if (window.gameMap && window.gameMap.mapId !== undefined) {
          mapId = Number(window.gameMap.mapId) || SOUTH_GATE_SPAWN.mapId;
        }
      }
      return normalizeMapPosition({ mapId, x, y });
    }

    captureGameTime() {
      if (typeof window !== 'undefined' && window.timeSystem && typeof window.timeSystem.getTime === 'function') {
        return window.timeSystem.getTime();
      }
      return { day: 1, hour: 8, minute: 0 };
    }

    captureProgress() {
      const existing = this.loadLocal()?.progress || {};

      const progress = {
        currentPhaseIndex: 0,
        activeQuest: null,
        completedQuests: [],
        questStatus: {},
        visitedLocations: [],
        unlockedSubjects: [],
        unlockedSkills: [],
        proficiencies: {},
        stats: {},
        sideQuests: {
          status: {},
          progress: {
            runs: 0,
            runStreak: 0,
            studyVisits: 0,
            canteenVisits: 0,
            explorationVisits: 0,
            clubActivities: 0,
            clubProjects: 0,
            labVisits: 0
          },
          joinedClubs: [],
          inventory: [],
          achievements: []
        },
        clubProgress: {},
        runningProgress: {},
        explorationProgress: {},
        activityProgress: {},
        items: existing.items || {},
        achievements: existing.achievements || [],
        money: existing.money,
        npcRelations: existing.npcRelations || {},
        npcDialogueHistory: existing.npcDialogueHistory || {},
        currentSceneId: existing.currentSceneId || 'campus',
        trackedQuestId: existing.trackedQuestId || null,
        trackedQuestKind: existing.trackedQuestKind || null,
        trackedQuestGroup: existing.trackedQuestGroup || null,
        trackedPoiId: existing.trackedPoiId || null,
        // 个人扩展「喻园第一周」的独立叙事进度，避免统一存档时被覆盖。
        campusWeek: existing.campusWeek || null
      };

      if (typeof window !== 'undefined' && window.questTriggerManager) {
        try {
          const qm = window.questTriggerManager;
          progress.currentPhaseIndex = qm.currentPhaseIndex ?? 0;
          progress.activeQuest = qm.activeQuest || null;
          progress.completedQuests = qm.getCompletedQuests ? qm.getCompletedQuests() : Array.from(qm.completedQuests || []);
          progress.questStatus = qm.questStatus ? { ...qm.questStatus } : {};
          progress.visitedLocations = Array.from(qm.visitedLocations || []);
          progress.unlockedSubjects = Array.from(qm.unlockedSubjects || []);
          progress.unlockedSkills = Array.from(qm.unlockedSkills || []);
          progress.proficiencies = qm.proficiencies ? { ...qm.proficiencies } : {};
          progress.skills = qm.skills ? {
            unlocked: [...(qm.skills.unlocked || [])],
            entries: { ...(qm.skills.entries || {}) },
            updatedAt: qm.skills.updatedAt || Date.now()
          } : { unlocked: [], entries: {}, updatedAt: Date.now() };
          progress.stats = qm.characterStats ? { ...qm.characterStats } : {};

          progress.sideQuests.status = qm.sideQuestStatus ? { ...qm.sideQuestStatus } : {};
          progress.sideQuests.progress = qm.sideQuestProgress ? { ...qm.sideQuestProgress } : progress.sideQuests.progress;
          progress.sideQuests.joinedClubs = Array.from(qm.joinedClubs || []);
          progress.sideQuests.achievements = Array.from(qm.achievements || []);
          progress.inventory = qm.getInventory ? qm.getInventory() : { items: {}, capacity: 99, updatedAt: null };
          progress.items = qm.getInventoryItems ? qm.getInventoryItems().reduce((acc, entry) => { acc[entry.itemId] = entry.quantity; return acc; }, {}) : (existing.items || {});

          progress.trackedQuestId = qm.trackedQuestId ?? existing.trackedQuestId ?? null;
          progress.trackedQuestKind = qm.trackedQuestKind ?? existing.trackedQuestKind ?? null;
          progress.trackedQuestGroup = qm.trackedQuestGroup ?? existing.trackedQuestGroup ?? null;
          progress.trackedPoiId = qm.trackedPoiId ?? existing.trackedPoiId ?? null;

          progress.runningProgress = { ...progress.sideQuests.progress };
          progress.explorationProgress = { visits: progress.sideQuests.progress.explorationVisits, studyVisits: progress.sideQuests.progress.studyVisits, canteenVisits: progress.sideQuests.progress.canteenVisits, labVisits: progress.sideQuests.progress.labVisits };
          progress.clubProgress = { joinedClubs: progress.sideQuests.joinedClubs, activities: progress.sideQuests.progress.clubActivities, projects: progress.sideQuests.progress.clubProjects };
          progress.activityProgress = { clubActivities: progress.sideQuests.progress.clubActivities, runs: progress.sideQuests.progress.runs };
          if (existing.achievements === undefined) progress.achievements = [...progress.sideQuests.achievements];

          if (typeof qm.exportNpcRelations === 'function') {
            progress.npcRelations = qm.exportNpcRelations();
          }
          if (qm.ending && typeof qm.ending === 'object') {
            progress.ending = { ...qm.ending };
          }
        } catch (error) {
          // 忽略 questManager 未就绪的情况
        }
      }

      return progress;
    }

    applyProgress(progress = {}) {
      if (typeof window === 'undefined' || !window.questTriggerManager) return;
      try {
        const qm = window.questTriggerManager;
        if (typeof qm.loadProgress === 'function') {
          qm.loadProgress(progress);
        } else {
          if (progress.currentPhaseIndex !== undefined) qm.currentPhaseIndex = progress.currentPhaseIndex;
          if (progress.activeQuest !== undefined) qm.activeQuest = progress.activeQuest;
          if (progress.completedQuests) qm.completedQuests = new Set(progress.completedQuests);
          if (progress.questStatus) qm.questStatus = { ...progress.questStatus };
          if (progress.visitedLocations) qm.visitedLocations = new Set(progress.visitedLocations);
          if (progress.unlockedSubjects) qm.unlockedSubjects = new Set(progress.unlockedSubjects);
          if (progress.unlockedSkills) qm.unlockedSkills = new Set(progress.unlockedSkills);
          if (progress.proficiencies) qm.proficiencies = { ...progress.proficiencies };
          if (progress.stats) qm.characterStats = { ...qm.characterStats, ...progress.stats };
          if (progress.sideQuests) {
            if (progress.sideQuests.status) qm.sideQuestStatus = { ...progress.sideQuests.status };
            if (progress.sideQuests.progress) qm.sideQuestProgress = { ...qm.sideQuestProgress, ...progress.sideQuests.progress };
            if (progress.sideQuests.joinedClubs) qm.joinedClubs = new Set(progress.sideQuests.joinedClubs);
            if (progress.sideQuests.achievements) qm.achievements = new Set(progress.sideQuests.achievements);
          }
        }
      } catch (error) {
        console.warn('[SaveManager] 应用任务进度失败:', error.message);
      }
    }

    captureModules() {
      const modules = {};
      if (typeof localStorage === 'undefined') return modules;

      const clubRaw = localStorage.getItem('hust_world_module_clubs');
      if (clubRaw) {
        try { modules.clubs = JSON.parse(clubRaw); } catch (error) { modules.clubs = clubRaw; }
      }

      const explorationRaw = localStorage.getItem('hust_world_module_exploration');
      if (explorationRaw) {
        try { modules.exploration = JSON.parse(explorationRaw); } catch (error) { modules.exploration = explorationRaw; }
      }

      return modules;
    }

    captureSettings() {
      const settings = {};
      if (typeof localStorage === 'undefined') return settings;
      const volume = localStorage.getItem('hust_world_volume');
      if (volume !== null) settings.volume = Number(volume);
      const muted = localStorage.getItem('hust_world_muted');
      if (muted !== null) settings.muted = muted === 'true';
      return settings;
    }

    normalizeSnapshot(input) {
      if (!input) return this.buildInitialSnapshot();
      const snapshot = typeof input === 'string' ? JSON.parse(input) : input;

      const normalized = {
        version: snapshot.version || SAVE_VERSION,
        savedAt: snapshot.savedAt || snapshot.last_saved_at || snapshot.updated_at || new Date().toISOString(),
        mode: snapshot.mode || this.getMode(),
        character: {},
        gameTime: {},
        position: {},
        progress: {},
        modules: {},
        settings: {}
      };

      const backend = snapshot;
      normalized.character = {
        characterId: snapshot.character?.characterId || backend.character_id || snapshot.characterId || null,
        characterName: snapshot.character?.characterName || backend.character_name || snapshot.characterName || '游客',
        gender: snapshot.character?.gender || backend.gender || snapshot.gender || 'unknown',
        college: snapshot.character?.college || backend.college || snapshot.college || '未知学院',
        level: Number(snapshot.character?.level ?? backend.level ?? 1),
        experience: Number(snapshot.character?.experience ?? backend.experience ?? 0),
        money: Number(snapshot.character?.money ?? backend.money ?? 1000),
        stamina: Number(snapshot.character?.stamina ?? snapshot.character?.physical ?? backend.stamina ?? backend.physical ?? 50),
        social: Number(snapshot.character?.social ?? backend.social ?? 50),
        knowledge: Number(snapshot.character?.knowledge ?? backend.knowledge ?? 50),
        mood: Number(snapshot.character?.mood ?? backend.mood ?? 50),
        grade: Number(snapshot.character?.grade ?? backend.grade ?? 1),
        semester: Number(snapshot.character?.semester ?? backend.semester ?? 1),
        week: Number(snapshot.character?.week ?? backend.week ?? 1)
      };

      normalized.gameTime = snapshot.gameTime || (backend.game_progress?.gameTime) || { day: 1, hour: 8, minute: 0 };
      const sourcePosition = snapshot.position || (backend.game_progress?.position) || {
        mapId: backend.current_map_id || 1,
        x: backend.position_x || 0,
        y: backend.position_y || 0
      };
      normalized.position = normalizeMapPosition({
        ...sourcePosition,
        mapId: sourcePosition.mapId ?? sourcePosition.map_id ?? backend.current_map_id
      });

      normalized.progress = snapshot.progress || (backend.game_progress?.progress) || {};
      if (normalized.progress.stats) {
        normalized.progress.stats = { ...normalized.progress.stats };
        if (normalized.progress.stats.stamina === undefined && normalized.progress.stats.physical !== undefined) {
          normalized.progress.stats.stamina = Number(normalized.progress.stats.physical);
        }
      }
      normalized.modules = snapshot.modules || (backend.game_progress?.modules) || {};
      normalized.settings = snapshot.settings || (backend.game_progress?.settings) || {};

      return normalized;
    }

    snapshotToRemotePayload(snapshot) {
      const normalized = this.normalizeSnapshot(snapshot);
      const char = normalized.character;
      return {
        level: char.level,
        experience: char.experience,
        money: char.money,
        physical: char.stamina,
        social: char.social,
        knowledge: char.knowledge,
        mood: char.mood,
        current_map_id: normalized.position.mapId,
        position_x: normalized.position.x,
        position_y: normalized.position.y,
        grade: char.grade,
        semester: char.semester,
        week: char.week,
        game_progress: {
          version: normalized.version,
          savedAt: normalized.savedAt,
          gameTime: normalized.gameTime,
          position: normalized.position,
          progress: normalized.progress,
          modules: normalized.modules,
          settings: normalized.settings
        }
      };
    }

    applySnapshot(snapshot) {
      const normalized = this.normalizeSnapshot(snapshot);
      if (typeof window !== 'undefined') {
        if (window.timeSystem && typeof window.timeSystem.setTime === 'function') {
          window.timeSystem.setTime(normalized.gameTime);
        }
        if (window._character) {
          const char = window._character;
          Object.assign(char, {
            level: normalized.character.level,
            experience: normalized.character.experience,
            money: normalized.character.money,
            stamina: normalized.character.stamina,
            maxStamina: normalized.character.maxStamina,
            social: normalized.character.social,
            knowledge: normalized.character.knowledge,
            mood: normalized.character.mood,
            grade: normalized.character.grade,
            semester: normalized.character.semester,
            week: normalized.character.week
          });
          // Character.teleport 会处理碰撞检测、移动状态和镜头同步。
          // 不能直接赋值 x/y，否则加载存档后镜头会继续停留在旧位置。
          if (typeof char.teleport === 'function') {
            char.teleport(normalized.position.x, normalized.position.y);
          } else {
            char.x = normalized.position.x;
            char.y = normalized.position.y;
          }
        }
        if (window.currentMapId !== undefined) {
          window.currentMapId = normalized.position.mapId;
        } else if (window.gameMap && window.gameMap.mapId !== undefined) {
          window.gameMap.mapId = normalized.position.mapId;
        }
      }
      this.applyProgress(normalized.progress);
      return normalized;
    }

    ensureMigration() {
      if (this.migrationAttempted) return;
      this.migrationAttempted = true;
      if (typeof localStorage === 'undefined') return;

      const alreadyMigrated = localStorage.getItem(SAVE_KEY);
      if (alreadyMigrated) return;

      const oldData = {};
      let hasOldData = false;
      for (const key of OLD_KEYS) {
        const raw = localStorage.getItem(key);
        if (raw) {
          oldData[key] = raw;
          hasOldData = true;
        }
      }
      if (!hasOldData) return;

      try {
        const snapshot = this.convertOldDataToSnapshot(oldData);
        this.saveLocal(snapshot);
        localStorage.setItem(BACKUP_KEY, JSON.stringify(oldData));
        for (const key of OLD_KEYS) {
          localStorage.removeItem(key);
        }
        console.log('[SaveManager] 旧存档已迁移至', SAVE_KEY, '备份保存在', BACKUP_KEY);
      } catch (error) {
        console.warn('[SaveManager] 旧存档迁移失败:', error.message);
      }
    }

    migrateOldSave() {
      this.ensureMigration();
      return this.loadLocal();
    }

    getProgress() {
      const snapshot = this.loadLocal() || this.buildInitialSnapshot();
      return snapshot.progress || {};
    }

    setProgressField(key, value) {
      const snapshot = this.loadLocal() || this.buildInitialSnapshot();
      snapshot.progress[key] = value;
      this.saveLocal(snapshot);
      this.applyProgress(snapshot.progress);
    }

    getProgressField(key, defaultValue = null) {
      return this.getProgress()[key] ?? defaultValue;
    }

    getStats() {
      const qm = typeof window !== 'undefined' ? window.questTriggerManager : null;
      if (qm && qm.characterStats) {
        return { ...qm.characterStats };
      }
      const snapshot = this.loadLocal() || this.buildInitialSnapshot();
      return {
        stamina: snapshot.character?.stamina ?? 50,
        social: snapshot.character?.social ?? 50,
        knowledge: snapshot.character?.knowledge ?? 50,
        mood: snapshot.character?.mood ?? 50,
        money: snapshot.character?.money ?? 1000,
        level: snapshot.character?.level ?? 1,
        experience: snapshot.character?.experience ?? 0,
        maxStamina: snapshot.character?.maxStamina ?? 100
      };
    }

    convertOldDataToSnapshot(oldData) {
      const character = oldData['hust_world_character'] ? JSON.parse(oldData['hust_world_character']) : {};
      const time = oldData['hust_world_time'] ? JSON.parse(oldData['hust_world_time']) : { day: 1, hour: 8, minute: 0 };
      const clubs = oldData['hust_world_module_clubs'] ? JSON.parse(oldData['hust_world_module_clubs']) : {};
      const exploration = oldData['hust_world_module_exploration'] ? JSON.parse(oldData['hust_world_module_exploration']) : {};

      return this.normalizeSnapshot({
        version: SAVE_VERSION,
        savedAt: new Date().toISOString(),
        mode: this.getMode(),
        character: {
          characterId: character.characterId || character.character_id || character.id || null,
          characterName: character.characterName || character.name || '游客',
          gender: character.gender || 'unknown',
          college: character.college || '未知学院',
          level: character.level || 1,
          experience: character.experience || 0,
          money: character.money || 1000,
          stamina: character.stamina || character.physical || 50,
          social: character.social || 50,
          knowledge: character.knowledge || 50,
          mood: character.mood || 50,
          grade: character.grade || 1,
          semester: character.semester || 1,
          week: character.week || 1
        },
        gameTime: time,
        position: normalizeMapPosition({
          mapId: character.currentMapId,
          x: character.x,
          y: character.y
        }),
        progress: {},
        modules: { clubs, exploration },
        settings: {}
      });
    }
  }

  const saveManager = new SaveManager();

  if (typeof globalThis !== 'undefined') {
    globalThis.SaveManager = SaveManager;
    globalThis.saveManager = saveManager;
  }

  globalThis.debugSaveGame = () => saveManager.save();
  globalThis.debugLoadSave = () => saveManager.load();
  globalThis.debugResetSave = () => saveManager.reset();

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      try {
        saveManager.saveLocalSync();
      } catch (error) {
        // 页面关闭时无法处理异步失败，静默忽略
      }
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SaveManager, saveManager };
  } else if (typeof exports !== 'undefined' && !exports.SaveManager) {
    exports.SaveManager = SaveManager;
    exports.saveManager = saveManager;
  }
})(typeof window !== 'undefined' ? window : global);
