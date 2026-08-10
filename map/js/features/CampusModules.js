/**
 * 新增玩法模块集成层
 *
 * 将 modules/ 中的跑酷、NPC、校园探索、社团系统接入现有地图事件总线。
 * 后端 API 不可用时使用浏览器本地数据兜底，方便课程设计直接演示。
 */

import { EventBus } from '../EventBus.js';
import { mapData } from '../MapData.js';
import { coordSys } from '../CoordSys.js';
import { character } from '../Character.js';
import { renderer } from '../Renderer.js';
import { ClubModule, NpcModule, RunnerModule, ExplorationModule } from '../../modules/index.js';

// API_BASE 配置：优先使用环境变量，否则根据当前页面端口自动适配
const API_BASE = window.HUST_API_BASE || 
                 (window.location.port === '8080' ? '/api' : 
                  window.location.port === '3000' ? '/api' : 
                  `http://localhost:${window.location.port || 8080}/api`);
const CLUB_STATE_KEY = 'hust_world_module_clubs';
const EXPLORATION_STATE_KEY = 'hust_world_module_exploration';
const RUNNING_STATE_KEY = 'hust_world_module_running';
const FITNESS_STATE_KEY = 'hust_world_module_fitness';

const CLUBS = [
  {
    club_id: 1,
    club_name: '蓝桥编程社',
    club_icon: '⌨️',
    description: '一起刷题、做项目、参加程序设计竞赛。',
  },
  {
    club_id: 2,
    club_name: '光影跑酷社',
    club_icon: '🏃',
    description: '在校园地图里挑战反应力和节奏感。',
  },
  {
    club_id: 3,
    club_name: '喻园摄影协会',
    club_icon: '📷',
    description: '记录校园地标，完成探索打卡作品集。',
  },
  {
    club_id: 4,
    club_name: '百景志愿队',
    club_icon: '🤝',
    description: '参与校园服务任务，提升社交与实践能力。',
  },
];

const CLUB_TASKS = [
  { 
    club_task_id: 101, 
    club_id: 1, 
    task_name: '完成一题最短路练习', 
    task_type: 'daily', 
    difficulty: 2, 
    description: JSON.stringify({
      summary: '用 Dijkstra 或 A* 思路完成一次路线规划练习',
      objective: {
        x: 2150,
        y: 2500,
        radius: 120,
        locationName: '图书馆',
        mode: 'checkin',
      },
      contactNpcName: '图书馆老师',
      flow: [
        '1. 找到图书馆',
        '2. 在自习区完成一次学习打卡',
      ],
    }), 
    reward: { experience: 30, social: 5 } 
  },
  { 
    club_task_id: 102, 
    club_id: 1, 
    task_name: '维护校园地图小工具', 
    task_type: 'competition', 
    difficulty: 3, 
    description: JSON.stringify({
      summary: '给地图系统补充一个实用交互功能',
      objective: {
        x: 3080,
        y: 1970,
        radius: 120,
        locationName: '大学生活动中心',
        mode: 'checkin',
      },
      contactNpcName: '社团干事',
      flow: [
        '1. 找到大学生活动中心',
        '2. 与社团成员一起讨论问题',
      ],
    }), 
    reward: { experience: 60, money: 10 } 
  },
  { 
    club_task_id: 201, 
    club_id: 2, 
    task_name: '完成一次跑酷挑战', 
    task_type: 'daily', 
    difficulty: 2, 
    description: JSON.stringify({
      summary: '进入操场跑酷小游戏并获得 500 分',
      objective: {
        x: 2526,
        y: 2773,
        radius: 120,
        locationName: '西操场',
        mode: 'checkin',
      },
      contactNpcName: '跑酷社招新同学',
      flow: [
        '1. 找到西操场',
        '2. 在跑酷区域完成一次挑战',
      ],
    }), 
    reward: { physical: 30, experience: 20 } 
  },
  { 
    club_task_id: 202, 
    club_id: 2, 
    task_name: '操场路线训练', 
    task_type: 'team_building', 
    difficulty: 1, 
    description: JSON.stringify({
      summary: '前往任意操场并进行一次路线训练',
      objective: {
        x: 5055,
        y: 1907,
        radius: 120,
        locationName: '东操场',
        mode: 'checkin',
      },
      contactNpcName: '跑酷社招新同学',
      flow: [
        '1. 找到东操场',
        '2. 完成一次跑酷训练',
      ],
    }), 
    reward: { physical: 20, social: 10 } 
  },
  { 
    club_task_id: 301, 
    club_id: 3, 
    task_name: '完成三处地标打卡', 
    task_type: 'daily', 
    difficulty: 2, 
    description: JSON.stringify({
      summary: '在校园探索玩法中完成至少三处地标打卡',
      objective: {
        x: 2150,
        y: 2500,
        radius: 120,
        locationName: '图书馆',
        mode: 'checkin',
      },
      contactNpcName: '喻园摄影协会成员',
      flow: [
        '1. 找到图书馆',
        '2. 开始你的校园探索之旅',
      ],
    }), 
    reward: { experience: 35, social: 10 } 
  },
  { 
    club_task_id: 401, 
    club_id: 4, 
    task_name: '新生引导志愿服务', 
    task_type: 'recruitment', 
    difficulty: 1, 
    description: JSON.stringify({
      summary: '在南大门附近与新生引导员对话',
      objective: {
        x: 2450,
        y: 3400,
        radius: 120,
        locationName: '南大门',
        mode: 'checkin',
      },
      contactNpcName: '新生引导员',
      flow: [
        '1. 找到南大门',
        '2. 与新生引导员对话',
      ],
    }), 
    reward: { social: 35, money: 5 } 
  },
];

class LocalGameplayApi {
  constructor() {
    this.clubState = this._loadJSON(CLUB_STATE_KEY, {
      memberships: [],
      tasks: [],
      nextMembershipId: 1,
      nextCharacterTaskId: 1,
    });
    this.exploredIds = new Set(this._loadJSON(EXPLORATION_STATE_KEY, []));
    this.runningState = this._loadJSON(RUNNING_STATE_KEY, {
      records: [], // { year, semester, date, score }
    });
    this.fitnessState = this._loadJSON(FITNESS_STATE_KEY, {
      records: [], // { year, semester, week, score, passed }
    });
  }

  async clubFetch(path, options = {}) {
    if (path === '/clubs') return CLUBS;
    if (path.startsWith('/clubs/recruitment/status')) {
      // 检查是否在百团大战期间
      const isRecruitment = window.getTimeEvents && window.timeSystem
        ? window.getTimeEvents.isClubRecruitmentTime(window.timeSystem.getTime())
        : false; // 如果时间系统未加载，默认不允许加入
      const message = isRecruitment
        ? '百团大战招新中：现在可以加入社团并接受任务。'
        : '暂非百团大战期间，无法加入社团，但可以接受已加入社团的任务。';
      return { isRecruitment, message };
    }
    if (path === '/clubs/character/1') return this._getMemberships();
    if (path === '/clubs/character/1/tasks') return this._getCharacterTasks();

    const tasksMatch = path.match(/^\/clubs\/(\d+)\/tasks/);
    if (tasksMatch) return this._getClubTasks(Number(tasksMatch[1]));

    if (path === '/clubs/join') {
      const body = await this._readBody(options);
      return this._joinClub(Number(body.clubId));
    }
    if (path === '/clubs/quit') {
      const body = await this._readBody(options);
      return this._quitClub(Number(body.characterClubId));
    }
    if (path === '/clubs/tasks/accept') {
      const body = await this._readBody(options);
      return this._acceptTask(Number(body.clubTaskId));
    }
    if (path === '/clubs/tasks/complete') {
      const body = await this._readBody(options);
      return this._completeTask(Number(body.characterClubTaskId), body);
    }

    throw new Error(`未实现的本地社团接口: ${path}`);
  }

  async fetchJSON(url) {
    const path = this._pathOf(url);
    if (path === '/maps') return mapData.getAllLocations().map(loc => ({
      map_id: loc.map_id,
      map_name: loc.map_name,
      map_type: loc.map_type,
      description: loc.description,
      x_coordinate: loc.x,
      y_coordinate: loc.y,
    }));
    if (path === '/npcs') return this._getNpcs();
    if (path === '/exploration/campus') return this._getExplorationLocations();
    if (path === '/exploration/character/1') {
      return [...this.exploredIds].map(mapId => ({ character_id: 1, map_id: mapId }));
    }
    throw new Error(`未实现的本地玩法接口: ${path}`);
  }

  completeExploration(explorationId) {
    const target = this._getExplorationLocations().find(item => item.exploration_id === explorationId);
    if (!target) throw new Error('探索点不存在');
    this.exploredIds.add(target.map_id);
    localStorage.setItem(EXPLORATION_STATE_KEY, JSON.stringify([...this.exploredIds]));
    return { ok: true, map_id: target.map_id, map_name: target.map_name };
  }

  _getMemberships() {
    return this.clubState.memberships.map(item => {
      const club = CLUBS.find(c => c.club_id === item.club_id);
      return {
        ...item,
        club_name: club?.club_name || '未知社团',
        club_icon: club?.club_icon || '🏠',
      };
    });
  }

  _getCharacterTasks() {
    console.log('[Club] 获取角色任务，状态:', this.clubState.tasks);
    return this.clubState.tasks.map(item => {
      const taskId = Number(item.club_task_id);
      const task = CLUB_TASKS.find(t => Number(t.club_task_id) === taskId);
      console.log('[Club] 查找任务，item:', item, '找到:', task);
      return {
        ...task,
        ...item,
      };
    }).filter(task => task.club_task_id);
  }

  _getClubTasks(clubId) {
    console.log('[Club] 获取社团任务，clubId:', clubId, '所有任务:', CLUB_TASKS);
    return CLUB_TASKS
      .filter(task => Number(task.club_id) === Number(clubId))
      .map(task => {
        const accepted = this.clubState.tasks.find(item => Number(item.club_task_id) === Number(task.club_task_id));
        const result = accepted ? { ...task, ...accepted } : { ...task, canAccept: true };
        console.log('[Club] 返回任务:', result);
        return result;
      });
  }

  _joinClub(clubId) {
    // 检查是否在百团大战期间
    const isRecruitment = window.getTimeEvents && window.timeSystem
      ? window.getTimeEvents.isClubRecruitmentTime(window.timeSystem.getTime())
      : false; // 默认不允许加入

    if (!isRecruitment) {
      console.log('[Club] 非百团大战期间，禁止加入社团');
      return { 
        canJoin: false, 
        error: '暂非百团大战期间，无法加入社团！请在第一或第二学年第一学期第4周期间加入。' 
      };
    }

    const club = CLUBS.find(item => item.club_id === clubId);
    if (!club) return { canJoin: false, error: '社团不存在' };
    if (this.clubState.memberships.some(item => item.club_id === clubId)) {
      return { canJoin: false, error: '你已经加入该社团' };
    }
    this.clubState.memberships.push({
      character_club_id: this.clubState.nextMembershipId++,
      character_id: 1,
      club_id: clubId,
      joined_at: new Date().toISOString(),
    });
    this._saveClubState();
    return { canJoin: true };
  }

  _quitClub(characterClubId) {
    const membership = this.clubState.memberships.find(item => item.character_club_id === characterClubId);
    if (!membership) return { ok: true };
    this.clubState.memberships = this.clubState.memberships.filter(item => item.character_club_id !== characterClubId);
    this.clubState.tasks = this.clubState.tasks.filter(item => item.club_id !== membership.club_id);
    this._saveClubState();
    return { ok: true };
  }

  _acceptTask(clubTaskId) {
    // 确保clubTaskId是数字类型
    const taskId = Number(clubTaskId);
    console.log('[Club] 尝试接取任务，ID:', clubTaskId, '转换后:', taskId, '可用任务:', CLUB_TASKS.map(t => t.club_task_id));
    
    // 更宽松的查找逻辑
    const task = CLUB_TASKS.find(item => {
      const match = Number(item.club_task_id) === taskId;
      if (match) console.log('[Club] 找到匹配的任务:', item);
      return match;
    });
    
    if (!task) {
      console.error('[Club] 找不到任务，clubTaskId:', clubTaskId, '类型:', typeof clubTaskId);
      throw new Error('任务不存在');
    }
    
    if (!this.clubState.memberships.some(item => item.club_id === task.club_id)) {
      this._joinClub(task.club_id);
    }
    if (!this.clubState.tasks.some(item => Number(item.club_task_id) === taskId)) {
      this.clubState.tasks.push({
        character_club_task_id: this.clubState.nextCharacterTaskId++,
        character_id: 1,
        club_id: task.club_id,
        club_task_id: taskId,
        status: 'accepted',
      });
    }
    this._saveClubState();
    return { ok: true };
  }

  _validateTaskObjective(task, currentPosition) {
    let details;
    try {
      details = typeof task.description === 'string' 
        ? JSON.parse(task.description) 
        : task.description;
    } catch {
      return;
    }
    
    if (!details || typeof details !== 'object' || !details.objective) return;
    
    const objective = details.objective;
    const radius = Number(objective.radius || 120);
    const target = { x: Number(objective.x), y: Number(objective.y) };
    const position = {
      x: Number(currentPosition?.x),
      y: Number(currentPosition?.y),
    };
    
    if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
      const targetText = objective.mode === 'talk'
        ? `请先靠近 ${objective.npcName || details.contactNpcName || '任务 NPC'}`
        : `请先前往 ${objective.locationName || details.targetLocation || '任务地点'}`;
      const error = new Error(`${targetText}，再完成任务。`);
      error.statusCode = 409;
      throw error;
    }
    
    const distance = Math.hypot(position.x - target.x, position.y - target.y);
    if (distance > radius) {
      const targetText = objective.mode === 'talk'
        ? `请靠近 ${objective.npcName || details.contactNpcName || '任务 NPC'}`
        : `请到 ${objective.locationName || details.targetLocation || '任务地点'} 附近打卡`;
      const error = new Error(`${targetText} 后再完成任务。`);
      error.statusCode = 409;
      throw error;
    }
  }

  _completeTask(characterClubTaskId, options = {}) {
    const accepted = this.clubState.tasks.find(item => item.character_club_task_id === characterClubTaskId);
    if (!accepted) throw new Error('任务未接受');
    
    const task = CLUB_TASKS.find(item => item.club_task_id === accepted.club_task_id);
    if (task) {
      this._validateTaskObjective(task, options.currentPosition);
    }
    
    accepted.status = 'completed';
    this._saveClubState();
    return { ok: true, reward: task?.reward || {} };
  }

  _getNpcs() {
    // 不返回任何数据，让NPC模块直接从API /api/npcs获取完整数据
    return [];
  }

  _getExplorationLocations() {
    return mapData.getAllLocations()
      .filter(loc => loc.map_type === 'landmark' || loc.map_type === 'playground')
      .map((loc, index) => ({
        exploration_id: 1000 + index,
        map_id: loc.map_id,
        map_name: loc.map_name,
        x_coordinate: loc.x,
        y_coordinate: loc.y,
        description: loc.description,
      }));
  }

  _pathOf(url) {
    return new URL(url, window.location.href).pathname.replace(/^\/api/, '');
  }

  async _readBody(options) {
    if (!options?.body) return {};
    return typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
  }

  _loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  _saveClubState() {
    localStorage.setItem(CLUB_STATE_KEY, JSON.stringify(this.clubState));
  }

  // 校园跑相关功能
  recordRun(score) {
    const time = window.timeSystem?.getTime();
    const record = {
      year: time?.year || 1,
      semester: time?.semester || 1,
      week: time?.week || 1,
      date: new Date().toISOString(),
      score: score || 0,
      success: (score || 0) >= 500 // 只要分数达到500就算成功完成一次
    };
    this.runningState.records.push(record);
    this._saveRunningState();
    return record;
  }

  getRunningRecords(year, semester) {
    return this.runningState.records.filter(r =>
      r.year === year && r.semester === semester
    );
  }

  getRunningCount(year, semester) {
    return this.getRunningRecords(year, semester).filter(r => r.success).length;
  }

  _saveRunningState() {
    localStorage.setItem(RUNNING_STATE_KEY, JSON.stringify(this.runningState));
  }

  // 体测相关功能
  recordFitnessTest(score) {
    const time = window.timeSystem?.getTime();
    const record = {
      year: time?.year || 1,
      semester: time?.semester || 1,
      week: time?.week || 1,
      date: new Date().toISOString(),
      score: score || 0,
      passed: (score || 0) >= 3000 // 体测要求3000分
    };
    this.fitnessState.records.push(record);
    this._saveFitnessState();
    return record;
  }

  getFitnessRecords(year, semester) {
    return this.fitnessState.records.filter(r =>
      r.year === year && r.semester === semester
    );
  }

  hasPassedFitnessTest(year, semester) {
    const records = this.getFitnessRecords(year, semester);
    return records.some(r => r.passed);
  }

  _saveFitnessState() {
    localStorage.setItem(FITNESS_STATE_KEY, JSON.stringify(this.fitnessState));
  }
}

class HybridGameplayApi extends LocalGameplayApi {
  constructor(apiBase) {
    super();
    this.apiBase = apiBase;
    this.remoteAvailable = null;
    // 缓存校园跑数据
    this._runningCountCache = {};
    this._runningRecordsCache = {};
  }

  async clubFetch(path, options = {}) {
    return this._tryRemote(path, options, () => super.clubFetch(path, options));
  }

  async fetchJSON(url) {
    const path = this._pathOf(url);
    return this._tryRemote(path, {}, () => super.fetchJSON(url));
  }

  async completeExploration(explorationId) {
    return this._tryRemote(
      '/exploration/complete',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: 1, explorationId }),
      },
      () => super.completeExploration(explorationId)
    );
  }

  // 记录校园跑到后端（异步）
  async recordRun(score) {
    const time = window.timeSystem?.getTime();
    const year = time?.year || 1;
    const semester = time?.semester || 1;
    
    // 尝试保存到后端
    try {
      const response = await fetch(this.apiBase + '/running/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: 1,
          semester: semester,
          distance: Math.floor(score / 10), // 将分数转换为距离（米）
          duration: Math.floor(score / 5),  // 将分数转换为时长（秒）
          status: (score || 0) >= 500 ? 'completed' : 'failed'
        })
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.remoteAvailable = true;
      
      const result = await response.json();
      
      // 同时保存到本地作为备份
      const localRecord = super.recordRun(score);
      
      // 更新缓存
      this._updateRunningCache(year, semester);
      
      return { remoteResult: result, localRecord };
    } catch (error) {
      console.warn('[CampusModules] 校园跑API不可用，使用本地存储:', error.message);
      this.remoteAvailable = false;
      // 回退到本地存储
      const localRecord = super.recordRun(score);
      // 更新缓存
      this._updateRunningCache(year, semester);
      return localRecord;
    }
  }

  // 获取校园跑记录（同步版本，优先使用缓存）
  getRunningRecords(year, semester) {
    const cacheKey = `${year}_${semester}`;
    
    // 如果有缓存，直接返回
    if (this._runningRecordsCache[cacheKey]) {
      return this._runningRecordsCache[cacheKey];
    }
    
    // 否则从本地存储获取
    const records = super.getRunningRecords(year, semester);
    this._runningRecordsCache[cacheKey] = records;
    return records;
  }

  // 获取校园跑统计（同步版本，优先使用缓存）
  getRunningCount(year, semester) {
    const cacheKey = `${year}_${semester}`;
    
    // 如果有缓存，直接返回
    if (this._runningCountCache[cacheKey] !== undefined) {
      return this._runningCountCache[cacheKey];
    }
    
    // 否则从本地存储获取
    const count = super.getRunningCount(year, semester);
    this._runningCountCache[cacheKey] = count;
    return count;
  }

  // 更新缓存（在记录新的校园跑后调用）
  _updateRunningCache(year, semester) {
    const cacheKey = `${year}_${semester}`;
    this._runningRecordsCache[cacheKey] = super.getRunningRecords(year, semester);
    this._runningCountCache[cacheKey] = super.getRunningCount(year, semester);
  }

  // 刷新缓存（从后端重新获取数据）
  async refreshRunningCache(year, semester) {
    try {
      const response = await fetch(
        this.apiBase + `/running/1?year=${year}&semester=${semester}`
      );
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.remoteAvailable = true;
      
      let records = await response.json();
      if (records && typeof records === 'object' && 'success' in records && 'data' in records) {
        records = records.data;
      }
      const cacheKey = `${year}_${semester}`;
      this._runningRecordsCache[cacheKey] = records;
      this._runningCountCache[cacheKey] = records.filter(r => r.status === 'completed').length;
      
      return true;
    } catch (error) {
      console.warn('[CampusModules] 刷新缓存失败:', error.message);
      this.remoteAvailable = false;
      return false;
    }
  }

  async _tryRemote(path, options, fallback) {
    try {
      const response = await fetch(this.apiBase + path, options);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.remoteAvailable = true;
      let result = await response.json();
      // 解包后端统一返回格式 { success: true, data: ... }
      if (result && typeof result === 'object' && 'success' in result && 'data' in result) {
        result = result.data;
      }
      return result;
    } catch (error) {
      if (this.remoteAvailable !== false) {
        console.warn(`[CampusModules] API 不可用，使用本地演示数据: ${error.message}`);
      }
      this.remoteAvailable = false;
      return fallback();
    }
  }
}

class CampusModulesBridge {
  constructor() {
    this.api = new HybridGameplayApi(API_BASE);
    this.clubSystem = null;
    this.npcSystem = null;
    this.runnerSystem = null;
    this.explorationSystem = null;
    this.lastNearbyPlayground = null;
    this.runnerHint = null;
    this.isFitnessMode = false; // 是否是体测模式
  }

  // 获取校园跑进度
  getRunningProgress() {
    const time = window.timeSystem?.getTime();
    return {
      count: this.api.getRunningCount(time?.year || 1, time?.semester || 1),
      total: 20,
      records: this.api.getRunningRecords(time?.year || 1, time?.semester || 1)
    };
  }

  // 检查是否在体测周
  isPhysicalTestWeek() {
    const time = window.timeSystem?.getTime();
    return window.getTimeEvents?.isPhysicalTestWeek(time) || false;
  }

  // 获取体测进度
  getFitnessProgress() {
    const time = window.timeSystem?.getTime();
    return {
      passed: this.api.hasPassedFitnessTest(time?.year || 1, time?.semester || 1),
      records: this.api.getFitnessRecords(time?.year || 1, time?.semester || 1)
    };
  }

  // 开始体测
  startFitnessTest() {
    if (this.isPhysicalTestWeek()) {
      this.isFitnessMode = true;
      this.runnerSystem?.show();
    }
  }

  async init() {
    this._injectStyles();
    await this._initClub();
    this._initRunner();
    this._initNpc();
    this._initExploration();
    this._buildControls();
    this._bindMapEvents();
    this._updateNearbySystems(character.getPos());
    
    // 初始化校园跑缓存
    await this._initRunningCache();
    
    this._requestRender();
  }

  // 初始化校园跑缓存（从后端加载数据）
  async _initRunningCache() {
    const time = window.timeSystem?.getTime();
    const year = time?.year || 1;
    const semester = time?.semester || 1;
    
    try {
      // 尝试从后端刷新缓存
      await this.api.refreshRunningCache(year, semester);
      console.log('[CampusModules] 校园跑缓存已初始化');
    } catch (error) {
      console.warn('[CampusModules] 初始化校园跑缓存失败，使用本地数据:', error.message);
    }
  }

  async _initClub() {
    const clubSystem = new ClubModule(API_BASE);
    clubSystem.fetch = (path, options) => this.api.clubFetch(path, options);
    clubSystem.getPlayerPosition = () => character.getPos();
    await clubSystem.init();
    this.clubSystem = clubSystem;
    window.clubSystem = clubSystem;
  }

  _initRunner() {
    this.runnerSystem = new RunnerModule();
    this.runnerSystem.init();
    // 设置游戏结束回调
    this.runnerSystem.onGameEnd = (score) => {
      this._handleRunnerEnd(score);
    };

    this.runnerHint = document.createElement('div');
    this.runnerHint.className = 'runner-map-hint';
    this.runnerHint.textContent = '按 R 跑酷';
    document.body.appendChild(this.runnerHint);
  }

  async _handleRunnerEnd(score) {
    if (this.isFitnessMode) {
      // 体测模式
      this.isFitnessMode = false;
      const record = this.api.recordFitnessTest(score);
      if (record && record.passed) {
        if (window.questTriggerUI) {
          window.questTriggerUI._showToast(
            `💪 体测通过！分数：${score}`,
            '#4CAF50',
            3000
          );
        }
      } else {
        if (window.questTriggerUI) {
          window.questTriggerUI._showToast(
            `😅 体测未通过，还需努力！分数：${score}/3000`,
            '#FF9800',
            3000
          );
        }
      }
    } else {
      // 普通跑酷模式
      const record = await this.api.recordRun(score);
      if (record && record.success) {
        // 显示成功提示
        const progress = this.getRunningProgress();
        if (window.questTriggerUI) {
          window.questTriggerUI._showToast(
            `🏃 校园跑完成！(${progress.count}/${progress.total})`,
            '#4CAF50',
            3000
          );
        }
      }
    }
  }

  _initNpc() {
    const npcSystem = new NpcModule(''); // 空字符串，让NPC模块自己用fetch调用 /api/npcs
    npcSystem.init();
    this.npcSystem = npcSystem;
    window.setTimeout(() => this._updateNearbySystems(character.getPos()), 300);
  }

  _initExploration() {
    const explorationSystem = new ExplorationModule(API_BASE);
    explorationSystem._fetchAPI = url => this.api.fetchJSON(url);
    explorationSystem._performExploration = async () => this._completeExploration();
    explorationSystem.init(1);
    this.explorationSystem = explorationSystem;
    window.setTimeout(() => this._updateNearbySystems(character.getPos()), 300);
  }

  _buildControls() {
    const panel = document.getElementById('sidePanel');
    const anchor = document.getElementById('selTitle');
    const box = document.createElement('div');
    box.className = 'module-control-box';
    box.innerHTML = `
      <h3>扩展玩法</h3>
      <div class="module-actions">
        <button id="btnClubModule" type="button">社团系统</button>
        <button id="btnRunnerModule" type="button">跑酷挑战</button>
      </div>
      <p class="module-hint">靠近 NPC 按 E 对话；靠近探索点按 F 打卡；点击操场可开始跑酷。</p>
    `;
    panel.insertBefore(box, anchor);

    document.getElementById('btnClubModule').addEventListener('click', () => this.clubSystem?.show());
    document.getElementById('btnRunnerModule').addEventListener('click', () => this.runnerSystem?.show());
  }

  _bindMapEvents() {
    EventBus.on('character:move', pos => this._updateNearbySystems(pos));
    EventBus.on('character:teleport', ({ to }) => this._updateNearbySystems(to));

    EventBus.on('location:click', ({ worldX, worldY, mapId = null }) => {
      const loc = mapId != null ? mapData.getLocationById(mapId) : mapData.findLocationAt(worldX, worldY);
      if (loc?.map_type === 'playground') {
        if (this.isPhysicalTestWeek()) {
          this.isFitnessMode = true;
        }
        window.setTimeout(() => this.runnerSystem?.show(), 80);
      }
    });

    EventBus.on('input:key', ({ key, type }) => {
      if (type !== 'down') return;
      if (key === 'r' && this.lastNearbyPlayground) {
        if (this.isPhysicalTestWeek()) {
          this.isFitnessMode = true;
        }
        this.runnerSystem?.show();
      }
      if (key === 'c') this.clubSystem?.show();
    });

    EventBus.on('render:post', ({ ctx, coordSys: cs }) => {
      this.npcSystem?.renderNPCs(ctx, cs, character.getPos());
      this._renderExplorationHint(cs);
      this._renderRunnerHint(cs);
    });
  }

  _updateNearbySystems(pos) {
    this.npcSystem?.checkNearby(pos.x, pos.y);
    this.explorationSystem?.checkNearby(pos.x, pos.y);
    this.lastNearbyPlayground = this._getNearbyPlayground(pos.x, pos.y);
    this._requestRender();
  }

  _getNearbyPlayground(x, y) {
    let nearest = null;
    let bestDist = 110;
    for (const loc of mapData.getLocationsByType('playground')) {
      const dist = Math.hypot(loc.x - x, loc.y - y);
      if (dist < bestDist) {
        bestDist = dist;
        nearest = loc;
      }
    }
    return nearest;
  }

  _renderExplorationHint(cs) {
    if (!this.explorationSystem) return;
    const p = cs.worldToScreen(character.x, character.y);
    this.explorationSystem.renderHint(p, renderer.getCanvas().getBoundingClientRect());
  }

  _renderRunnerHint(cs) {
    if (!this.runnerHint) return;
    if (!this.lastNearbyPlayground || this.runnerSystem?.isVisible()) {
      this.runnerHint.style.display = 'none';
      return;
    }
    const p = cs.worldToScreen(character.x, character.y);
    const rect = renderer.getCanvas().getBoundingClientRect();
    this.runnerHint.style.left = `${rect.left + p.x + 22}px`;
    this.runnerHint.style.top = `${rect.top + p.y + 12}px`;
    this.runnerHint.style.display = 'block';
    // 根据是否是体测周显示不同提示
    if (this.isPhysicalTestWeek()) {
      this.runnerHint.textContent = '按 R 体测 (需3000分)';
      this.runnerHint.style.borderColor = '#FF9800';
      this.runnerHint.style.color = '#FF9800';
    } else {
      this.runnerHint.textContent = '按 R 跑酷';
      this.runnerHint.style.borderColor = 'rgba(255,255,255,0.5)';
      this.runnerHint.style.color = '#ffe08a';
    }
  }

  async _completeExploration() {
    const target = this.explorationSystem?.nearestLocation;
    if (!target || !target.map_name || this.explorationSystem.exploredLocations.has(target.map_id)) return;

    await this.api.completeExploration(target.exploration_id);
    this.explorationSystem.exploredLocations.add(target.map_id);
    this.explorationSystem.hintEl.style.display = 'none';

    document.getElementById('explorationLocation').textContent = `已在「${target.map_name}」拍照打卡`;
    document.getElementById('explorationProgress').textContent = `探索进度: ${this.explorationSystem.exploredLocations.size} / ${this.explorationSystem.explorationLocations.length}`;
    this.explorationSystem.successEl.style.display = 'flex';
    EventBus.emit('exploration:checkin', { location: target });

    window.setTimeout(() => {
      this.explorationSystem.successEl.style.display = 'none';
    }, 2200);
  }

  _requestRender() {
    renderer.markDirty();
    renderer.render();
  }

  _injectStyles() {
    if (document.getElementById('campusModulesStyle')) return;
    const style = document.createElement('style');
    style.id = 'campusModulesStyle';
    style.textContent = `
      .module-control-box {
        margin: 16px 0;
        padding: 12px;
        border: 1px solid rgba(255,255,255,0.12);
        background: rgba(255,255,255,0.05);
        border-radius: 8px;
      }
      .module-control-box h3 {
        margin-top: 0;
      }
      .module-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .module-actions button {
        min-height: 34px;
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(109,213,223,0.14);
        color: #fff;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 700;
      }
      .module-actions button:hover {
        background: rgba(109,213,223,0.24);
      }
      .module-hint {
        margin: 10px 0 0;
        color: #9fb2c8;
        font-size: 12px;
        line-height: 1.5;
      }
      .runner-map-hint {
        display: none;
        position: fixed;
        z-index: 520;
        padding: 5px 9px;
        border: 1px solid rgba(255,255,255,0.5);
        background: rgba(4,14,38,0.82);
        color: #ffe08a;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 700;
        pointer-events: none;
      }

      /* ==================== 社团系统美化 ==================== */
      #club-container {
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) scale(0.95) !important;
        width: 660px !important;
        max-height: 85vh !important;
        background: rgba(18, 22, 40, 0.97) !important;
        backdrop-filter: blur(20px) saturate(180%) !important;
        -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
        border: 1px solid rgba(255,255,255,0.08) !important;
        border-radius: 16px !important;
        padding: 28px 24px 24px !important;
        color: #e0e6f0 !important;
        font-family: 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', sans-serif !important;
        z-index: 9999 !important;
        overflow-y: auto !important;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) !important;
        opacity: 0 !important;
        transition: opacity 0.25s ease, transform 0.25s ease !important;
        pointer-events: none !important;
      }
      #club-container.visible {
        opacity: 1 !important;
        transform: translate(-50%, -50%) scale(1) !important;
        pointer-events: auto !important;
      }
      #club-container::-webkit-scrollbar { width: 5px; }
      #club-container::-webkit-scrollbar-track { background: transparent; }
      #club-container::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }
      #club-container::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.22); }

      /* 标题 */
      .club-title {
        color: #ffd700;
        text-align: center;
        margin: 0 0 14px;
        font-size: 22px;
        font-weight: 700;
        letter-spacing: 1px;
        text-shadow: 0 0 20px rgba(255,215,0,0.25);
      }

      /* 状态栏 */
      .club-status-bar {
        padding: 10px 16px;
        border-radius: 10px;
        margin-bottom: 16px;
        text-align: center;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.5px;
      }
      .club-status-bar.active { background: linear-gradient(135deg, #2E7D32, #1B5E20); }
      .club-status-bar.inactive { background: linear-gradient(135deg, #E65100, #BF360C); }

      /* 标签栏 */
      .club-tabs {
        display: flex;
        gap: 0;
        margin-bottom: 18px;
        background: rgba(255,255,255,0.04);
        border-radius: 10px;
        padding: 4px;
      }
      .club-tab-btn {
        flex: 1;
        padding: 9px 0;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        color: #8899aa;
        background: transparent;
        transition: all 0.2s ease;
        letter-spacing: 0.5px;
      }
      .club-tab-btn:hover { color: #c0d0e0; background: rgba(255,255,255,0.04); }
      .club-tab-btn.active { color: #fff; background: rgba(76,175,80,0.25); box-shadow: 0 2px 8px rgba(76,175,80,0.15); }

      /* 内容区 */
      .club-content {
        max-height: 55vh;
        overflow-y: auto;
        overscroll-behavior: contain;
      }
      .club-content::-webkit-scrollbar { width: 4px; }
      .club-content::-webkit-scrollbar-track { background: transparent; }
      .club-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }

      /* 关闭按钮 */
      .club-close-btn {
        position: absolute;
        top: 16px;
        right: 16px;
        width: 32px;
        height: 32px;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 50%;
        background: rgba(255,255,255,0.04);
        color: #8899aa;
        font-size: 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        backdrop-filter: blur(4px);
      }
      .club-close-btn:hover { color: #fff; background: rgba(244,67,54,0.2); border-color: rgba(244,67,54,0.3); }

      /* 社团卡片 */
      .club-card {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 10px;
        transition: all 0.2s ease;
      }
      .club-card:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); }
      .club-card.member { background: rgba(46,125,50,0.12); border-color: rgba(76,175,80,0.2); }
      .club-card-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .club-card-name { display: flex; align-items: center; gap: 10px; }
      .club-card-icon { font-size: 28px; }
      .club-card-title { font-size: 16px; font-weight: 700; color: #ffd700; }
      .club-card-desc { color: #8899aa; font-size: 12px; margin-top: 8px; line-height: 1.5; }

      /* 任务卡片 */
      .club-task-card {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 10px;
        padding: 14px;
        margin-bottom: 8px;
        transition: all 0.2s ease;
      }
      .club-task-card:hover { background: rgba(255,255,255,0.05); }
      .club-task-card.completed { background: rgba(46,125,50,0.1); border-color: rgba(76,175,80,0.15); }
      .club-task-card.accepted { background: rgba(230,81,0,0.08); border-color: rgba(255,152,0,0.15); }
      .club-task-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .club-task-name { font-weight: 700; font-size: 14px; }
      .club-task-meta { font-size: 12px; color: #8899aa; margin-left: 8px; }
      .club-task-desc { color: #aab8c4; font-size: 12px; margin-top: 6px; line-height: 1.5; }
      .club-task-reward { color: #66BB6A; font-size: 12px; margin-top: 6px; font-weight: 500; }
      .club-task-details {
        margin-top: 8px;
        padding: 10px 12px;
        background: rgba(255,255,255,0.03);
        border-radius: 8px;
        color: #bcc8d4;
        font-size: 12px;
        line-height: 1.7;
      }
      .club-task-details strong { color: #9fd6ff; }
      .club-task-badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.5px;
      }

      /* 通用按钮 */
      .club-btn {
        padding: 6px 14px;
        border: none;
        border-radius: 7px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        color: #fff;
        transition: all 0.15s ease;
        letter-spacing: 0.5px;
        white-space: nowrap;
        user-select: none;
      }
      .club-btn:hover { filter: brightness(1.15); transform: translateY(-1px); }
      .club-btn:active { transform: scale(0.95); filter: brightness(0.9); transition: all 0.05s ease; }
      .club-btn:disabled { cursor: not-allowed; filter: none; transform: none; }
      .club-btn.green { background: linear-gradient(135deg, #43A047, #2E7D32); }
      .club-btn.blue { background: linear-gradient(135deg, #1E88E5, #1565C0); }
      .club-btn.red { background: linear-gradient(135deg, #EF5350, #C62828); }
      .club-btn.gray { background: linear-gradient(135deg, #555, #444); color: #999; cursor: not-allowed; opacity: 0.6; }
      .club-btn.small { padding: 4px 10px; font-size: 11px; }

      /* 空状态 */
      .club-empty {
        text-align: center;
        color: #8899aa;
        padding: 40px 20px;
        font-size: 14px;
        line-height: 1.8;
      }

      /* 区块标题 */
      .club-section-title {
        color: #ffd700;
        margin: 16px 0 10px;
        font-size: 15px;
        font-weight: 700;
      }
      .club-subtitle {
        color: #9fd6ff;
        font-size: 12px;
        margin: -6px 0 12px;
      }
    `;
    document.head.appendChild(style);
  }
}

async function bootCampusModules() {
  if (!mapData.loaded) {
    EventBus.once('data:loaded', () => bootCampusModules());
    return;
  }

  const bridge = new CampusModulesBridge();
  window.campusModules = bridge;
  try {
    await bridge.init();
    console.log('[CampusModules] 跑酷、NPC、校园探索、社团系统已接入');
  } catch (error) {
    console.error('[CampusModules] 初始化失败:', error);
  }
}

bootCampusModules();
