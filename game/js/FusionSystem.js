/**
 * ============================================================
 * 融合集成入口 —— 将地图系统 + 主线战斗系统完全融合
 * ============================================================
 * 
 * 该文件作为融合后的主入口，整合以下系统：
 *   1. ljt_地图系统 —— 开放世界校园地图（完整保留）
 *   2. 主线战斗系统 —— 任务系统 + 战斗系统（完整保留）
 * 
 * 融合架构：
 *   - 地图系统作为核心世界容器（保留所有原始功能）
 *   - 主线战斗系统的任务通过 QuestTriggerManager 集成
 *   - 双重触发条件：前置任务完成 + 到达指定地点
 *   - 战斗系统通过 iframe 内嵌或 Phaser 场景切换
 */

import questTriggerManager from './managers/QuestTriggerManager.js';
import questTriggerUI from './ui/QuestTriggerUI.js';
import {
  MAIN_QUEST_CONFIG,
  QUEST_STATUS,
  QUEST_TYPE
} from './config/QuestTriggerConfig.js';
import { getDialogueForQuest } from './config/DialogueConfig.js';

/**
 * 融合系统主类
 */
class FusionSystem {
  constructor() {
    this.initialized = false;
    
    // 地图系统引用
    this.mapSystem = null;
    this.character = null;
    this.eventBus = null;
    this.mapData = null;
    this.coordSys = null;
    
    // 战斗系统引用
    this.battleSystem = null;
    this.battleScene = null;
    
    // 角色数据
    this.characterData = null;
    
    // 事件清理函数
    this._cleanups = [];
  }
  
  /**
   * 初始化融合系统
   * 必须在原始地图系统加载完成后调用
   */
  async init(options = {}) {
    if (this.initialized) return;
    
    // 1. 获取地图系统的核心模块引用
    this._captureMapSystemModules();
    
    // 2. 加载角色数据
    this.characterData = options.characterData || this._loadCharacterFromStorage();
    
    // 3. 初始化任务触发管理器
    questTriggerManager.init(this.characterData);
    
    // 将questTriggerManager暴露到window上,供时间系统使用
    if (typeof window !== 'undefined') {
      window.questTriggerManager = questTriggerManager;
    }
    
    // 4. 初始化任务UI
    questTriggerUI.init();
    
    // 5. 绑定地图系统事件
    this._bindMapEvents();
    
    // 6. 注入战斗系统桥接
    this._injectBattleBridge();
    
    // 7. 注册渲染扩展（绘制任务标记）
    this._registerRenderExtension();
    
    // 8. 启动任务引导（箭头指引 + 初始任务提示）
    this._startQuestGuide();
    
    this.initialized = true;
    
    return this;
  }
  
  /**
   * 捕获地图系统的核心模块引用
   */
  _captureMapSystemModules() {
    // 从全局窗口对象获取地图系统模块
    if (typeof window !== 'undefined') {
      // 这些模块由原始地图系统的 main.js 注册
      this.eventBus = window._eventBus || null;
      this.character = window._character || null;
      this.mapData = window._mapData || null;
      this.coordSys = window._coordSys || null;
      this.mapSystem = {
        eventBus: this.eventBus,
        character: this.character,
        mapData: this.mapData,
        coordSys: this.coordSys
      };
    }
  }
  
  /**
   * 绑定地图系统事件
   */
  _bindMapEvents() {
    if (!this.eventBus) {
      return;
    }
    
    // 监听角色移动事件 → 更新任务触发管理器中的位置
    const c1 = this.eventBus.on('character:move', (data) => {
      if (this.character) {
        const pos = this.character.getPos();
        if (pos) {
          questTriggerManager.updatePlayerPosition(pos.x, pos.y);
        }
      }
    });
    this._cleanups.push(c1);
    
    // 监听角色传送事件
    const c2 = this.eventBus.on('character:teleport', (data) => {
      questTriggerManager.updatePlayerPosition(data.x, data.y);
    });
    this._cleanups.push(c2);
    
    // 监听地图数据加载完成事件
    const c3 = this.eventBus.on('data:loaded', () => {
      if (this.character) {
        const pos = this.character.getPos();
        if (pos) {
          questTriggerManager.updatePlayerPosition(pos.x, pos.y);
        }
      }
    });
    this._cleanups.push(c3);
    
    // 监听位置点击事件（用于自动寻路到任务地点）
    const c4 = this.eventBus.on('location:click', (data) => {
      this._handleLocationClick(data);
    });
    this._cleanups.push(c4);
    
  }
  
  /**
   * 处理地图位置点击
   * 检查点击的位置是否是某个任务的地点
   */
  _handleLocationClick(data) {
    if (!data || !data.worldX || !data.worldY) return;
    
    // 更新位置
    questTriggerManager.updatePlayerPosition(data.worldX, data.worldY);
    
    // 检查是否到达了任务地点
    const availableQuests = questTriggerManager.getAvailableQuests();
    if (availableQuests.length > 0) {
      // 显示最近的可触发任务提示
      questTriggerUI._showPrompt(availableQuests[0], 'available');
    }
  }
  
  /**
   * 注入战斗系统桥接
   */
  _injectBattleBridge() {
    // 监听任务激活事件，根据任务类型跳转对应场景
    const c1 = questTriggerManager.addListener('quest:activated', (data) => {
      const { quest } = data;

      if (quest.type === QUEST_TYPE.TRAINING) {
        // 军训任务 → 启动射击小游戏
        this._startMilitaryTraining(quest);
      } else if (quest.type === QUEST_TYPE.EXAM) {
        // 考试任务 → 回合制PVE战斗
        this._startBattleForQuest(quest);
      } else if (quest.type === QUEST_TYPE.DIALOGUE) {
        // 上课/对话任务 → 显示对话面板
        this._startDialogueForQuest(quest);
      } else if (quest.type === QUEST_TYPE.SELF_STUDY) {
        // 自习任务 → 显示自习面板（图书馆/教学楼均可）
        this._startSelfStudyForQuest(quest);
      } else if (quest.type === QUEST_TYPE.REST) {
        // 休息任务 → 显示休息面板，恢复体力
        this._startRestForQuest(quest);
      }
    });
    this._cleanups.push(c1);
    
    // 监听任务完成事件
    const c2 = questTriggerManager.addListener('quest:completed', () => {
      // 任务完成后显示提示
      const availableQuests = questTriggerManager.getAvailableQuests();
      if (availableQuests.length > 0) {
        setTimeout(() => {
          questTriggerUI._showToast(
            `⚔️ ${availableQuests[0].name} 可触发，前往任务地点按 E 键`,
            '#4CAF50', 4000
          );
        }, 1500);
      }
    });
    this._cleanups.push(c2);
    
  }
  
  /**
   * 启动考试战斗（仅用于考试任务）
   * 使用内联回合制战斗系统
   */
  _startBattleForQuest(quest) {
    this._startBattleInline(quest);
  }
  
  /**
   * ============================================================
   * 军训射击小游戏 —— 20秒限时射击训练
   * ============================================================
   * 
   * 与主线战斗系统 MilitaryTrainingScene 功能对应：
   *   - 20秒限时
   *   - 点击射击移动靶子
   *   - S/A/B/C/D 五级评价
   *   - 完成后自动完成任务
   */
  _startMilitaryTraining(quest) {
    
    const overlay = document.createElement('div');
    overlay.id = 'military-training-overlay';
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      z-index: 10000; background: rgba(0,0,0,0.9);
      display: flex; justify-content: center; align-items: center;
      user-select: none; cursor: crosshair;
    `;
    
    const gameBox = document.createElement('div');
    gameBox.style.cssText = `
      width: 700px; height: 500px;
      background: linear-gradient(180deg, #3a7d44 0%, #5a9e4b 30%, #8b6b3d 70%, #6b4f2a 100%);
      border: 3px solid rgba(255,215,0,0.4);
      border-radius: 16px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 0 60px rgba(255,215,0,0.15);
    `;
    
    // 射击区域
    const shootingArea = document.createElement('div');
    shootingArea.id = 'shooting-area';
    shootingArea.style.cssText = `
      width: 100%; height: 100%;
      position: relative;
      cursor: crosshair;
    `;
    gameBox.appendChild(shootingArea);
    
    // HUD 面板
    const hud = document.createElement('div');
    hud.id = 'training-hud';
    hud.style.cssText = `
      position: absolute; top: 14px; left: 14px; right: 14px;
      display: flex; justify-content: space-between; align-items: center;
      color: #fff; font-family: 'Microsoft YaHei', sans-serif;
      font-weight: 700; font-size: 15px;
      z-index: 10; pointer-events: none;
      text-shadow: 0 2px 6px rgba(0,0,0,0.7);
    `;
    hud.innerHTML = `
      <span>🎯 <span id="training-score">0</span> 分</span>
      <span style="color:#FFD700;">⏱ <span id="training-timer">20</span>s</span>
      <span>🏆 评级: <span id="training-grade">-</span></span>
    `;
    gameBox.appendChild(hud);
    
    overlay.appendChild(gameBox);
    document.body.appendChild(overlay);
    
    // 游戏状态
    let score = 0;
    let timeLeft = 20;
    let gameOver = false;
    let targets = [];
    let spawnInterval = null;
    let timerInterval = null;
    let comboCount = 0;
    let comboTimeout = null;
    
    const scoreEl = document.getElementById('training-score');
    const timerEl = document.getElementById('training-timer');
    const gradeEl = document.getElementById('training-grade');
    
    // 获取评级
    const getGrade = (s) => {
      if (s >= 25) return { grade: 'S', color: '#FFD700', reward: 100 };
      if (s >= 20) return { grade: 'A', color: '#4CAF50', reward: 80 };
      if (s >= 15) return { grade: 'B', color: '#2196F3', reward: 60 };
      if (s >= 10) return { grade: 'C', color: '#FF9800', reward: 40 };
      return { grade: 'D', color: '#f44336', reward: 20 };
    };
    
    // 创建靶子
    const spawnTarget = () => {
      if (gameOver) return;
      if (targets.length >= 4) return;
      
      const target = document.createElement('div');
      const size = 40 + Math.floor(Math.random() * 30);
      const maxX = shootingArea.clientWidth - size;
      const maxY = shootingArea.clientHeight - size;
      const x = Math.random() * maxX;
      const y = Math.random() * maxY;
      const points = size <= 50 ? 3 : size <= 60 ? 2 : 1;
      
      target.style.cssText = `
        position: absolute;
        width: ${size}px; height: ${size}px;
        left: ${x}px; top: ${y}px;
        border-radius: 50%;
        background: radial-gradient(circle, #fff 0%, #f44336 30%, #b71c1c 70%, #7f0000 100%);
        cursor: crosshair;
        transition: transform 0.1s;
        box-shadow: 0 0 12px rgba(244,67,54,0.5), inset 0 0 8px rgba(0,0,0,0.3);
      `;
      
      // 内环（暴击区域）
      const innerRing = document.createElement('div');
      innerRing.style.cssText = `
        position: absolute;
        width: ${size * 0.4}px; height: ${size * 0.4}px;
        left: 50%; top: 50%;
        transform: translate(-50%, -50%);
        border-radius: 50%;
        background: radial-gradient(circle, #fff 0%, #ffeb3b 100%);
        box-shadow: 0 0 6px rgba(255,235,59,0.8);
        pointer-events: none;
      `;
      target.appendChild(innerRing);
      
      target.addEventListener('click', (e) => {
        e.stopPropagation();
        if (gameOver) return;
        
        const isCrit = e.target === innerRing || innerRing.contains(e.target);
        const earnedPoints = isCrit ? points * 2 : points;
        score += earnedPoints;
        comboCount++;
        
        // 连击加分
        if (comboCount >= 5) score += 2;
        
        // 视觉效果
        const hitEffect = document.createElement('div');
        hitEffect.style.cssText = `
          position: absolute;
          left: ${e.offsetX - 20}px; top: ${e.offsetY - 20}px;
          font-size: ${isCrit ? '28px' : '20px'};
          color: ${isCrit ? '#FFD700' : '#fff'};
          font-weight: 900;
          pointer-events: none;
          z-index: 20;
          text-shadow: 0 0 10px ${isCrit ? 'rgba(255,215,0,0.8)' : 'rgba(255,255,255,0.8)'};
          animation: floatUp 0.8s ease-out forwards;
        `;
        hitEffect.textContent = isCrit ? `💥+${earnedPoints}` : `+${earnedPoints}`;
        shootingArea.appendChild(hitEffect);
        setTimeout(() => hitEffect.remove(), 800);
        
        // 射击闪光
        target.style.transform = 'scale(0.1)';
        target.style.opacity = '0';
        
        setTimeout(() => {
          target.remove();
          targets = targets.filter(t => t !== target);
        }, 150);
        
        // 更新UI
        scoreEl.textContent = score;
        const { grade, color } = getGrade(score);
        gradeEl.textContent = grade;
        gradeEl.style.color = color;
        
        // 连击计时器
        if (comboTimeout) clearTimeout(comboTimeout);
        comboTimeout = setTimeout(() => { comboCount = 0; }, 1500);
      });
      
      shootingArea.appendChild(target);
      targets.push(target);
      
      // 靶子自动消失
      setTimeout(() => {
        if (target.parentNode && !gameOver) {
          target.style.transform = 'scale(0)';
          target.style.opacity = '0';
          setTimeout(() => {
            if (target.parentNode) target.remove();
            targets = targets.filter(t => t !== target);
          }, 200);
        }
      }, 3000);
    };
    
    // 添加浮动动画样式
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      @keyframes floatUp {
        0% { opacity: 1; transform: translateY(0) scale(1); }
        100% { opacity: 0; transform: translateY(-60px) scale(1.5); }
      }
    `;
    document.head.appendChild(styleSheet);
    
    // 计时器
    timerInterval = setInterval(() => {
      timeLeft--;
      timerEl.textContent = timeLeft;
      
      if (timeLeft <= 5) {
        timerEl.style.color = '#f44336';
        timerEl.style.animation = 'floatUp 0.5s ease-in-out';
      }
      
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        clearInterval(spawnInterval);
        gameOver = true;
        
        // 清理所有靶子
        targets.forEach(t => { if (t.parentNode) t.remove(); });
        targets = [];
        
        this._endMilitaryTraining(overlay, quest, score);
      }
    }, 1000);
    
    // 靶子生成器
    spawnTarget();
    spawnTarget();
    spawnInterval = setInterval(() => {
      spawnTarget();
    }, 800 + Math.random() * 600);
    
    // 背景点击不计分
    shootingArea.addEventListener('click', (e) => {
      if (e.target === shootingArea && !gameOver) {
        comboCount = 0;
      }
    });
    
    // ESC 退出
    const escHandler = (e) => {
      if (e.key === 'Escape' && !gameOver) {
        clearInterval(timerInterval);
        clearInterval(spawnInterval);
        gameOver = true;
        targets.forEach(t => { if (t.parentNode) t.remove(); });
        targets = [];
        document.removeEventListener('keydown', escHandler);
        this._endMilitaryTraining(overlay, quest, score);
      }
    };
    document.addEventListener('keydown', escHandler);
    overlay._escHandler = escHandler;
    overlay._styleSheet = styleSheet;
  }
  
  /**
   * 结束军训射击小游戏
   */
  _endMilitaryTraining(overlay, quest, score) {
    const { grade, color } = (() => {
      if (score >= 25) return { grade: 'S', color: '#FFD700' };
      if (score >= 20) return { grade: 'A', color: '#4CAF50' };
      if (score >= 15) return { grade: 'B', color: '#2196F3' };
      if (score >= 10) return { grade: 'C', color: '#FF9800' };
      return { grade: 'D', color: '#f44336' };
    })();

    // 军训评分只影响显示评价，不双重发放奖励
    // completeQuest 会通过 _grantRewards 统一发放 rewards: { exp:50, physical:20, social:10, gold:100 }
    
    // 清理事件
    if (overlay._escHandler) {
      document.removeEventListener('keydown', overlay._escHandler);
    }
    if (overlay._styleSheet) {
      overlay._styleSheet.remove();
    }
    
    overlay.innerHTML = `
      <div style="
        background: linear-gradient(160deg, #1a1d35 0%, #12142a 40%, #1a1d35 100%);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 20px; padding: 40px 48px; width: 420px;
        text-align: center; color: #e5e7eb;
        font-family: 'Microsoft YaHei', sans-serif;
        box-shadow: 0 24px 64px rgba(0,0,0,0.55);
      ">
        <div style="font-size: 56px; margin-bottom: 12px;">${grade === 'S' ? '🏆' : grade === 'A' ? '🎖️' : grade === 'B' ? '🎯' : '✅'}</div>
        <div style="font-size: 26px; font-weight: 700; color: ${color}; margin-bottom: 6px;">
          评价：${grade}
        </div>
        <div style="font-size: 14px; color: #9ca3af; margin-bottom: 18px;">
          射击得分：${score} 分 · 军训完成！
        </div>
        <div style="display: flex; gap: 8px; justify-content: center; margin-bottom: 24px; flex-wrap: wrap;">
          <span style="background:rgba(96,165,250,0.12);color:#60a5fa;padding:7px 14px;border-radius:8px;font-size:12px;font-weight:600;">⭐ +50 经验</span>
          <span style="background:rgba(76,175,80,0.12);color:#4ade80;padding:7px 14px;border-radius:8px;font-size:12px;font-weight:600;">💪 +20 体能</span>
          <span style="background:rgba(249,115,22,0.12);color:#fb923c;padding:7px 14px;border-radius:8px;font-size:12px;font-weight:600;">🤝 +10 社交</span>
          <span style="background:rgba(255,215,0,0.12);color:#FFD700;padding:7px 14px;border-radius:8px;font-size:12px;font-weight:600;">💰 +100 金币</span>
        </div>
        <button id="training-complete-btn" style="
          padding: 14px 48px;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: #fff; border: none; border-radius: 10px;
          font-size: 16px; font-weight: 700; cursor: pointer;
          letter-spacing: 1px; box-shadow: 0 4px 16px rgba(34,197,94,0.2);
          transition: all 0.2s;
        ">✅ 确认完成</button>
      </div>
    `;
    
    document.getElementById('training-complete-btn').addEventListener('click', () => {
      overlay.remove();
      questTriggerManager.completeQuest(quest.id);
    });
  }
  
  /**
   * ============================================================
   * 内联战斗系统 —— 对齐主线 BattleScene 的回合制考试战斗UI
   * ============================================================
   * 
   * 功能对齐 主线战斗系统 BattleScene：
   *   - 4 个技能槽（2 通用技能 + 2 学科技能）
   *   - 熟练度乘数（1.0 / 1.15 / 1.30 / 1.50 / 1.75）
   *   - Buff 系统（临时抱佛脚 +50% 伤害 / 时间管理先手）
   *   - Debuff 系统（重点标记 降防20% 持续3回合）
   *   - 治疗技能（课后复习 恢复20% HP）
   *   - 怪物技能（难题攻击 / 概念混淆 / 特殊攻击）
   *   - 逃跑机制（根据怪物类型决定成功率）
   *   - 暴击率基于熟练度（5% + 熟练度等级 * 1%）
   */
  _startBattleInline(quest) {
    // ============================================================
    //  主线战斗系统原版UI —— 与 battle/client 保持完全一致
    // ============================================================
    const self = this;

    // ========= 怪物配置 =========
    const MONSTER_CONFIG = [
      { name: '高等数学之灵', emoji: '👾', type: 'elite',
        skills: [
          { name: '极限压榨', type: 'damage', power: 1.3 },
          { name: '积分围剿', type: 'damage', power: 1.5 },
          { name: 'ε-δ语言',  type: 'debuff', power: 0.6, debuffName: '思维混乱', effect: 'defenseDown', turns: 2 }
        ]
      }, {
        name: '线性代数守护者', emoji: '👹', type: 'normal',
        skills: [
          { name: '矩阵变换', type: 'damage', power: 1.2 },
          { name: '行列式陷阱', type: 'damage', power: 1.4 },
          { name: '特征值震荡', type: 'heal', power: 0.15 }
        ]
      }, {
        name: '电路分析魔像', emoji: '🤖', type: 'elite',
        skills: [
          { name: '基尔霍夫裁决', type: 'damage', power: 1.3 },
          { name: '交流电震荡', type: 'damage', power: 1.6 },
          { name: '电磁干扰', type: 'debuff', power: 0.5, debuffName: '信号紊乱', effect: 'damageDown', turns: 2 }
        ]
      }, {
        name: '工程力学守卫', emoji: '🛡️', type: 'normal',
        skills: [
          { name: '结构力学冲撞', type: 'damage', power: 1.2 },
          { name: '材料疲劳', type: 'damage', power: 1.4 },
          { name: '加固结构', type: 'buff', power: 0.3, buffName: '护甲提升', effect: 'defenseUp', turns: 2 }
        ]
      }, {
        name: '法律条文壁垒', emoji: '👑', type: 'boss',
        skills: [
          { name: '法条压制', type: 'damage', power: 1.5 },
          { name: '证据链封锁', type: 'damage', power: 1.8 },
          { name: '反诉', type: 'heal', power: 0.2 },
          { name: '律师函警告', type: 'debuff', power: 0.3, debuffName: '恐惧', effect: 'damageDown', turns: 3 }
        ]
      }, {
        name: '管理学幽灵', emoji: '👻', type: 'normal',
        skills: [
          { name: 'SWOT分析', type: 'damage', power: 1.2 },
          { name: '绩效考核风暴', type: 'damage', power: 1.4 },
          { name: '组织架构', type: 'buff', power: 0.2, buffName: '效率提升', effect: 'defenseUp', turns: 2 }
        ]
      }
    ];
    // 科目→怪物映射：考试科目匹配对应的怪物，避免"线性代数考试遇到物理怪物"
    const subjectMonsterMap = {
      '高等数学':       0, // → 高等数学之灵
      '高等数学（二）': 0, // → 高等数学之灵
      '线性代数':       1, // → 线性代数守护者
      '概率论':         0, // → 高等数学之灵（数学类）
    };
    const subjectKeyForMonster = quest.subject || '';
    const mappedIdx = subjectMonsterMap[subjectKeyForMonster];
    let monsterIdx;
    if (mappedIdx !== undefined) {
      monsterIdx = mappedIdx;
    } else {
      // 专业课/毕业论文等：从剩余怪物池中随机选（避开已被明确映射的怪物）
      const mappedSet = new Set(Object.values(subjectMonsterMap));
      const availableMonsters = MONSTER_CONFIG
        .map((_, i) => i)
        .filter(i => !mappedSet.has(i));
      // 如果全部被排除则回退到全部池
      const pool = availableMonsters.length > 0 ? availableMonsters : MONSTER_CONFIG.map((_, i) => i);
      monsterIdx = pool[Math.floor(Math.random() * pool.length)];
    }
    const monster = MONSTER_CONFIG[monsterIdx];
    // 怪物精灵图映射（与主线战斗系统配置一致）
    const monsterImages = [
      'assets/battle/怪物1.png',   // 高等数学之灵 (normal)
      'assets/battle/怪物2.png',   // 线性代数守护者 (normal)
      'assets/battle/怪物3.webp',  // 电路分析魔像 (elite)
      'assets/battle/怪物4.webp',  // 工程力学守卫 (normal)
      'assets/battle/怪物5.webp',  // 法律条文壁垒 (boss)
      'assets/battle/怪物2.png'    // 管理学幽灵 (normal, 复用)
    ];
    const monsterImage = monsterImages[monsterIdx] || monsterImages[0];

    // ========= 属性计算 =========
    const playerStats = questTriggerManager.characterStats;
    const proficiencies = questTriggerManager.proficiencies || {};
    const subjectKey = quest.subject || 'default';
    const prof = proficiencies[subjectKey] || { level: 1, points: 0 };
    const profLevel = Math.min(5, Math.max(1, prof.level || 1));
    const profMultipliers = { 1: 1.00, 2: 1.15, 3: 1.30, 4: 1.50, 5: 1.75 };
    const profMul = profMultipliers[profLevel] || 1.0;
    const playerMaxHP = 80 + playerStats.level * 20 + playerStats.physical * 5;
    const playerBaseAtk = 15 + playerStats.level * 3 + Math.floor(playerStats.knowledge / 5);
    const isExam = quest.type === QUEST_TYPE.EXAM;
    const levelFactor = playerStats.level;
    const typeMuls = { boss: 2.3, elite: 1.7, normal: 1.3 };
    const mTypeMul = typeMuls[monster.type] || 1.0;
    // 怪物数值 —— 期末考试难度高，BOSS更强，需提升熟练度才能应对
    const enemyMaxHP = Math.floor((isExam ? 200 : 100) * mTypeMul * (1 + levelFactor * 0.15));
    const enemyAtk   = Math.floor((isExam ? 22 : 10)  * mTypeMul * (1 + levelFactor * 0.12));
    const enemyDef   = Math.floor((isExam ? 5 : 3)    * mTypeMul * (1 + levelFactor * 0.08));
    // 怪物技能效果缩放（随等级提升）
    const monsterHealPercent = 0.15 + levelFactor * 0.01;
    const playerName = (self.characterData && self.characterData.characterName) || '你';

    // ========= 战斗状态 =========
    let currentPlayerHP = playerMaxHP;
    let currentEnemyHP = enemyMaxHP;
    let isPlayerTurn = true;
    let battleOver = false;
    let turnCount = 0;
    let buffs = { damage: 1.0, nextTurnFirst: false };
    let debuffs = { defense: 1.0, duration: 0 };
    let monsterBuffs = { defense: 1.0, turns: 0 };   // 怪物增益（护甲提升等）
    let playerDebuffs = { damage: 1.0, turns: 0 };    // 玩家减益（攻击力下降等）
    let battleLog = [];
    const typeLabel = monster.type === 'boss' ? 'BOSS' : monster.type === 'elite' ? '精英' : '普通';

    // ========= 技能 =========
    const universalSkills = [
      { id: 'u1', name: '认真听讲', icon: '📝', type: 'damage', baseDamage: 20 },
      { id: 'u2', name: '课后复习', icon: '💚', type: 'heal', baseDamage: 0 },
      { id: 'u3', name: '临时抱佛脚', icon: '🔥', type: 'buff', baseDamage: 0 },
      { id: 'u4', name: '重点标记', icon: '🎯', type: 'debuff', baseDamage: 0 }
    ];
    const subjectSkills = [
      { id: 's1', name: quest.subject ? `${quest.subject}推导` : '公式推导', icon: '🧮', type: 'damage', baseDamage: 30 },
      { id: 's2', name: quest.subject ? `${quest.subject}分析` : '逻辑分析', icon: '🔍', type: 'damage', baseDamage: 25 }
    ];
    const allSkills = [...universalSkills, ...subjectSkills];

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    // ========= 屏幕闪光层 =========
    const screenFlash = document.createElement('div');
    screenFlash.className = 'battle-screen-flash';
    document.body.appendChild(screenFlash);

    // ========= 建造 DOM —— 主线战斗系统原版结构 =========
    const overlay = document.createElement('div');
    overlay.className = 'battle-overlay';

    const container = document.createElement('div');
    container.className = 'battle-container';
    overlay.appendChild(container);

    // skillType → CSS class
    const skillTypeClass = (t) => {
      if (t === 'damage') return 'skill-damage';
      if (t === 'heal') return 'skill-heal';
      if (t === 'buff') return 'skill-buff';
      if (t === 'debuff') return 'skill-debuff';
      return 'skill-damage';
    };

    // skillType → tag label
    const skillTypeLabel = (t) => {
      if (t === 'damage') return '攻击';
      if (t === 'heal') return '治疗';
      if (t === 'buff') return '增益';
      if (t === 'debuff') return '减益';
      return '';
    };

    container.innerHTML = `
      <div class="battle-bg"></div>

      <!-- 顶部信息栏 -->
      <div class="top-info-bar">
        <div class="player-info-bar">
          <div class="player-sprite-small">🧑</div>
          <div class="player-info-column">
            <div class="player-info-row">
              <div class="player-name">${playerName}</div>
              <div class="player-level">Lv.${playerStats.level}</div>
              <div class="hp-bar-container">
                <div class="hp-bar player" id="playerHpBar" style="width:100%"></div>
              </div>
              <div class="hp-text" id="playerHpText">${currentPlayerHP}/${playerMaxHP}</div>
            </div>
            <div class="player-prof-row">
              <div class="prof-bar-container">
                <div class="prof-bar" id="playerProfBar" style="width:${(profLevel / 5) * 100}%"></div>
              </div>
              <div class="prof-text" id="playerProfText">熟练度 Lv.${profLevel}</div>
            </div>
          </div>
        </div>

        <div class="enemy-info-bar">
          <div class="enemy-info-column">
            <div class="enemy-info-row">
              <div class="hp-text" id="enemyHpText">${currentEnemyHP}/${enemyMaxHP}</div>
              <div class="hp-bar-container enemy-hp">
                <div class="hp-bar enemy" id="enemyHpBar" style="width:100%"></div>
              </div>
              <div class="enemy-level">Lv.${Math.max(1, playerStats.level - 2 + Math.floor(Math.random() * 5))}</div>
              <div class="enemy-name">${monster.name}</div>
            </div>
          </div>
          <div class="enemy-sprite-small" style="background-image:url('${monsterImage}')"></div>
        </div>
      </div>

      <!-- 回合指示器 -->
      <div class="turn-indicator player-turn" id="turnIndicator">⚔️ 你的回合</div>

      <!-- 战斗场景区域 -->
      <div class="battle-field">
        <div class="player-buff-container">
          <div class="player-avatar" id="playerAvatar">🧑</div>
          <div class="buff-icons" id="playerBuffs"></div>
        </div>
        <div class="vs-badge">VS</div>
        <div class="enemy-avatar${monster.type === 'boss' ? ' boss' : ''}" id="enemyAvatar" style="background-image:url('${monsterImage}')"></div>
      </div>

      <!-- 战斗日志 -->
      <div class="battle-log">
        <h3>📜 战斗日志</h3>
        <div id="logContainer">
          <div class="log-entry">⚔️ 战斗开始！你先出手！</div>
        </div>
      </div>

      <!-- 技能栏 -->
      <div class="skill-bar" id="skillBar">
        ${allSkills.map(s => `
          <button class="skill-button ${skillTypeClass(s.type)}" id="btn-skill-${s.id}" data-skill-id="${s.id}">
            <span class="skill-tag">${skillTypeLabel(s.type)}</span>
            ${s.icon} ${s.name}
            ${s.type === 'damage' ? `<div class="skill-damage-val">伤害 ${s.baseDamage}</div>` : ''}
            ${s.type === 'heal' ? '<div class="skill-damage-val">恢复 20%</div>' : ''}
          </button>
        `).join('')}
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <button class="action-button flee" id="btnFlee">🏃 逃跑</button>
      </div>
    `;

    document.body.appendChild(overlay);

    // ----- DOM 引用 -----
    const getEl = (id) => container.querySelector('#' + id);
    const playerHpBar = getEl('playerHpBar');
    const playerHpText = getEl('playerHpText');
    const enemyHpBar = getEl('enemyHpBar');
    const enemyHpText = getEl('enemyHpText');
    const logContainer = getEl('logContainer');
    const turnIndicator = getEl('turnIndicator');
    const playerBuffs = getEl('playerBuffs');
    const playerAvatar = getEl('playerAvatar');
    const enemyAvatar = getEl('enemyAvatar');
    const btnFlee = getEl('btnFlee');

    // ========= 动画辅助方法 =========

    const showDamageFloat = (targetEl, amount, isCrit, isHeal) => {
      if (!targetEl || !targetEl.parentNode) return;
      const el = document.createElement('div');
      let cls = 'battle-damage-float';
      if (isCrit) cls += ' crit';
      if (isHeal) cls += ' heal';
      el.className = cls;
      el.style.cssText = `left:${30 + Math.random() * 40}%;top:${20 + Math.random() * 30}%;`;
      if (isHeal) { el.textContent = `+${amount}`; }
      else if (isCrit) { el.textContent = `暴击! ${amount}`; }
      else { el.textContent = `-${amount}`; }
      targetEl.parentNode.style.position = 'relative';
      targetEl.parentNode.appendChild(el);
      setTimeout(() => el.remove(), 1000);
    };

    const flashScreen = (color, duration) => {
      screenFlash.style.background = color;
      screenFlash.classList.add('active');
      setTimeout(() => {
        screenFlash.style.background = 'transparent';
        screenFlash.classList.remove('active');
      }, duration || 150);
    };

    /** 更新血条 */
    const updateHPBar = (barEl, textEl, current, max) => {
      if (!barEl || !textEl) return;
      const pct = clamp(current / max * 100, 0, 100);
      barEl.style.width = pct + '%';
      if (pct <= 25) barEl.classList.add('low'); else barEl.classList.remove('low');
      textEl.textContent = `${Math.max(0, current)} / ${max}`;
    };

    /** 添加日志 */
    const addLog = (msg, cls) => {
      battleLog.push({ msg, cls });
      if (battleLog.length > 6) battleLog.shift();
      if (!logContainer) return;
      logContainer.innerHTML = battleLog.map(l =>
        `<div class="log-entry${l.cls ? ' ' + l.cls : ''}">${l.msg}</div>`
      ).join('');
      logContainer.parentElement.scrollTop = logContainer.parentElement.scrollHeight;
    };

    /** 更新 buff/状态图标 */
    const updateBuffsUI = () => {
      if (!playerBuffs) return;
      let html = '';
      // 玩家正面增益
      if (buffs.damage > 1.0) html += '<div class="buff-icon buff-appear" title="伤害+50%">🔥</div>';
      if (buffs.nextTurnFirst) html += '<div class="buff-icon buff-appear" title="下回合先手">⏱</div>';
      // 玩家负面状态
      if (playerDebuffs.turns > 0) {
        html += `<div class="buff-icon enemy-buff buff-appear" title="攻击力下降${playerDebuffs.turns}回合">💫<span class="buff-count">${playerDebuffs.turns}</span></div>`;
      }
      // 敌人被降防（玩家施加的 debuff）
      if (debuffs.duration > 0) {
        html += `<div class="buff-icon buff-appear" title="敌人降防${debuffs.duration}回合">🎯<span class="buff-count">${debuffs.duration}</span></div>`;
      }
      // 怪物增益
      if (monsterBuffs.turns > 0) {
        html += `<div class="buff-icon enemy-buff buff-appear" title="怪物护甲提升${monsterBuffs.turns}回合">🛡️<span class="buff-count">${monsterBuffs.turns}</span></div>`;
      }
      playerBuffs.innerHTML = html;
    };

    /** 禁用/启用技能按钮 */
    const setSkillsEnabled = (enabled) => {
      allSkills.forEach(s => {
        const btn = container.querySelector('#btn-skill-' + s.id);
        if (btn) btn.disabled = !enabled;
      });
      if (btnFlee) btnFlee.disabled = !enabled;
    };

    // ========= 使用技能（含完整动画序列） =========
    const useSkill = (skill) => {
      if (!isPlayerTurn || battleOver) return;
      isPlayerTurn = false;
      setSkillsEnabled(false);
      turnIndicator.textContent = '⏳ 技能释放中...';
      turnIndicator.className = 'turn-indicator';

      if (skill.type === 'damage') {
        // 玩家攻击动画
        playerAvatar.classList.add('attack');
        setTimeout(() => {
          playerAvatar.classList.remove('attack');
          const randomCoeff = 0.9 + Math.random() * 0.2;
          const critRate = 0.05 + profLevel * 0.01;
          const isCrit = Math.random() < critRate;
          let rawDamage = Math.round((skill.baseDamage + Math.floor(playerBaseAtk * 0.30)) * profMul * randomCoeff * buffs.damage);
          let damage = Math.max(1, rawDamage - Math.floor(enemyDef * debuffs.defense * monsterBuffs.defense));
          if (isCrit) damage = Math.round(damage * 2.0);
          currentEnemyHP = Math.max(0, currentEnemyHP - damage);
          if (buffs.damage > 1.0) buffs.damage = 1.0;

          // 敌人震动+闪烁+掉血
          if (isCrit) {
            enemyAvatar.classList.add('critical');
            setTimeout(() => enemyAvatar.classList.remove('critical'), 600);
          }
          enemyAvatar.classList.add('hurt');
          setTimeout(() => enemyAvatar.classList.remove('hurt'), 400);
          showDamageFloat(enemyAvatar, damage, isCrit, false);
          if (isCrit) flashScreen('rgba(255,215,0,0.25)', 200);
          addLog(`💥【${skill.name}】${isCrit ? '暴击！' : ''}造成 ${damage} 点伤害`, isCrit ? 'critical' : '');
          updateHPBar(enemyHpBar, enemyHpText, currentEnemyHP, enemyMaxHP);
          updateBuffsUI();

          if (currentEnemyHP <= 0) {
            setTimeout(() => endBattle(true), 500);
            return;
          }
          turnIndicator.textContent = '👾 敌人回合';
          turnIndicator.className = 'turn-indicator enemy-turn';
          setSkillsEnabled(false);
          setTimeout(() => enemyTurn(), 1000);
        }, 200);

      } else if (skill.type === 'heal') {
        const healAmount = Math.floor(playerMaxHP * 0.15);
        currentPlayerHP = Math.min(playerMaxHP, currentPlayerHP + healAmount);
        if (buffs.damage > 1.0) buffs.damage = 1.0;
        playerAvatar.classList.add('buffed');
        setTimeout(() => playerAvatar.classList.remove('buffed'), 1000);
        showDamageFloat(playerAvatar, healAmount, false, true);
        addLog(`💚【${skill.name}】恢复 ${healAmount} HP`);
        updateHPBar(playerHpBar, playerHpText, currentPlayerHP, playerMaxHP);
        updateBuffsUI();
        setTimeout(() => {
          turnIndicator.textContent = '👾 敌人回合';
          turnIndicator.className = 'turn-indicator enemy-turn';
          enemyTurn();
        }, 1000);

      } else if (skill.type === 'buff') {
        buffs.damage = 1.5;
        playerAvatar.classList.add('buffed');
        setTimeout(() => playerAvatar.classList.remove('buffed'), 1000);
        flashScreen('rgba(255,152,0,0.18)', 250);
        addLog(`🔥【${skill.name}】下回合伤害提升50%！`);
        updateBuffsUI();
        setTimeout(() => {
          turnIndicator.textContent = '👾 敌人回合';
          turnIndicator.className = 'turn-indicator enemy-turn';
          enemyTurn();
        }, 1000);

      } else if (skill.type === 'debuff') {
        debuffs.defense = 0.8;
        debuffs.duration = 3;
        flashScreen('rgba(139,92,246,0.15)', 200);
        enemyAvatar.classList.add('hurt');
        setTimeout(() => enemyAvatar.classList.remove('hurt'), 400);
        addLog(`🎯【${skill.name}】敌人防御降低20%，持续3回合！`);
        updateBuffsUI();
        setTimeout(() => {
          turnIndicator.textContent = '👾 敌人回合';
          turnIndicator.className = 'turn-indicator enemy-turn';
          enemyTurn();
        }, 1000);
      }
    };

    // ========= 敌人回合（含动画）—— 支持 damage/heal/buff/debuff 技能 =========
    const enemyTurn = () => {
      if (battleOver) return;

      // 玩家减益倒计时
      if (playerDebuffs.turns > 0) {
        playerDebuffs.turns--;
        if (playerDebuffs.turns === 0) {
          playerDebuffs.damage = 1.0;
          addLog('🔓 玩家负面效果消失！');
          updateBuffsUI();
        }
      }
      // 怪物增益倒计时
      if (monsterBuffs.turns > 0) {
        monsterBuffs.turns--;
        if (monsterBuffs.turns === 0) {
          monsterBuffs.defense = 1.0;
          addLog('🔓 怪物护甲效果消失！');
          updateBuffsUI();
        }
      }
      // 怪物被降防倒计时
      if (debuffs.duration > 0) {
        debuffs.duration--;
        if (debuffs.duration === 0) {
          debuffs.defense = 1.0;
          addLog('🔓 重点标记效果消失！');
          updateBuffsUI();
        }
      }

      const randomSkill = monster.skills[Math.floor(Math.random() * monster.skills.length)];
      const skillType = randomSkill.type || 'damage';

      // --- 怪物伤害技能 ---
      if (skillType === 'damage') {
        const randomCoeff = 0.9 + Math.random() * 0.2;
        let damage = Math.max(1, Math.floor(enemyAtk * randomSkill.power * randomCoeff * playerDebuffs.damage));
        let logMsg;
        if (buffs.nextTurnFirst) {
          damage = Math.floor(damage * 0.5);
          logMsg = `⏱ ${monster.name}使用【${randomSkill.name}】！先手减半，造成 ${damage} 点伤害`;
          buffs.nextTurnFirst = false;
        } else {
          logMsg = `👾 ${monster.name}使用【${randomSkill.name}】，造成 ${damage} 点伤害`;
        }
        enemyAvatar.classList.add('attack');
        setTimeout(() => {
          enemyAvatar.classList.remove('attack');
          currentPlayerHP = Math.max(0, currentPlayerHP - damage);
          playerAvatar.classList.add('hurt');
          setTimeout(() => playerAvatar.classList.remove('hurt'), 400);
          flashScreen('rgba(244,67,54,0.15)', 150);
          showDamageFloat(playerAvatar, damage, false, false);
          addLog(logMsg, 'enemy');
          updateHPBar(playerHpBar, playerHpText, currentPlayerHP, playerMaxHP);
          updateBuffsUI();
          if (currentPlayerHP <= 0) {
            setTimeout(() => endBattle(false), 500);
            return;
          }
          endEnemyTurn();
        }, 200);
      }

      // --- 怪物治疗技能 ---
      else if (skillType === 'heal') {
        const healAmount = Math.max(1, Math.floor(enemyMaxHP * (monsterHealPercent * randomSkill.power)));
        currentEnemyHP = Math.min(enemyMaxHP, currentEnemyHP + healAmount);
        enemyAvatar.classList.add('buffed');
        setTimeout(() => enemyAvatar.classList.remove('buffed'), 1000);
        flashScreen('rgba(76,175,80,0.15)', 250);
        showDamageFloat(enemyAvatar, healAmount, false, true);
        addLog(`💚 ${monster.name}使用【${randomSkill.name}】恢复 ${healAmount} HP`, 'enemy-heal');
        updateHPBar(enemyHpBar, enemyHpText, currentEnemyHP, enemyMaxHP);
        updateBuffsUI();
        setTimeout(() => endEnemyTurn(), 800);
      }

      // --- 怪物增益技能 ---
      else if (skillType === 'buff') {
        monsterBuffs.defense = 1.0 + (randomSkill.power || 0.3);
        monsterBuffs.turns = randomSkill.turns || 2;
        enemyAvatar.classList.add('buffed');
        setTimeout(() => enemyAvatar.classList.remove('buffed'), 1000);
        flashScreen('rgba(255,152,0,0.15)', 250);
        addLog(`🛡️ ${monster.name}使用【${randomSkill.name}】${randomSkill.buffName || '获得增益'}，持续${monsterBuffs.turns}回合`, 'enemy-buff');
        updateBuffsUI();
        setTimeout(() => endEnemyTurn(), 800);
      }

      // --- 怪物减益技能 ---
      else if (skillType === 'debuff') {
        playerDebuffs.damage = randomSkill.power || 0.5;
        playerDebuffs.turns = randomSkill.turns || 2;
        playerAvatar.classList.add('hurt');
        setTimeout(() => playerAvatar.classList.remove('hurt'), 400);
        flashScreen('rgba(139,92,246,0.15)', 200);
        addLog(`💫 ${monster.name}使用【${randomSkill.name}】${randomSkill.debuffName || '施加负面效果'}，攻击力下降，持续${playerDebuffs.turns}回合`, 'enemy-debuff');
        updateBuffsUI();
        setTimeout(() => endEnemyTurn(), 800);
      }
    };

    /** 敌人回合结束后切换回玩家回合 */
    const endEnemyTurn = () => {
      isPlayerTurn = true;
      turnCount++;
      turnIndicator.textContent = '⚔️ 你的回合';
      turnIndicator.className = 'turn-indicator player-turn';
      setSkillsEnabled(true);
    };

    // ========= 逃跑 =========
    const tryFlee = () => {
      if (!isPlayerTurn || battleOver) return;
      isPlayerTurn = false;
      const fleeRate = monster.type === 'boss' ? 0.3 : monster.type === 'elite' ? 0.5 : 0.7;
      const success = Math.random() < fleeRate;
      if (success) {
        addLog('🏃 成功逃跑！');
        battleOver = true;
        setSkillsEnabled(false);
        turnIndicator.textContent = '🏃 逃跑成功';
        turnIndicator.className = 'turn-indicator';
        // 重置任务状态，允许重新挑战
        questTriggerManager.questStatus[quest.id] = QUEST_STATUS.AVAILABLE;
        questTriggerManager.activeQuest = null;
        setTimeout(() => cleanup(), 800);
        questTriggerUI._showToast('💡 逃跑了，可以重新挑战', '#FF9800', 2500);
      } else {
        addLog('❌ 逃跑失败！');
        setSkillsEnabled(false);
        turnIndicator.textContent = '👾 敌人回合';
        turnIndicator.className = 'turn-indicator enemy-turn';
        setTimeout(() => enemyTurn(), 800);
      }
    };

    /** 生成胜利粒子 */
    const spawnParticles = () => {
      const particles = ['🌟', '✨', '🎉', '💫', '⭐', '🎊'];
      for (let i = 0; i < 12; i++) {
        setTimeout(() => {
          const p = document.createElement('div');
          p.className = 'battle-particle';
          p.textContent = particles[Math.floor(Math.random() * particles.length)];
          p.style.cssText = `
            left:${10 + Math.random() * 80}%;top:${30 + Math.random() * 50}%;
            font-size:${14 + Math.random() * 20}px;
            animation-duration:${1 + Math.random() * 1.5}s;
            animation-delay:${Math.random() * 0.3}s;
          `;
          container.appendChild(p);
          setTimeout(() => p.remove(), 2000);
        }, i * 80);
      }
    };

    // ========= 结束战斗 =========
    const endBattle = (won) => {
      battleOver = true;
      setSkillsEnabled(false);
      if (won) {
        addLog('🎉 战斗胜利！', 'victory');
        flashScreen('rgba(34,197,94,0.2)', 400);
        turnIndicator.textContent = '🏆 胜利！';
        turnIndicator.className = 'turn-indicator';
        // 战斗熟练度增益（EXAM任务无 proficiencyGain 配置，在此发放）
        const profGain = 30 + Math.floor(Math.random() * 20);
        if (questTriggerManager.proficiencies && questTriggerManager.proficiencies[subjectKey]) {
          questTriggerManager.proficiencies[subjectKey].points += profGain;
          questTriggerManager._checkProficiencyLevelUp(subjectKey);
        }
        // exp/gold 由 completeQuest → _grantRewards 统一发放，此处不重复

        setTimeout(() => {
          // 展示任务配置奖励（由 _grantRewards 发放）
          const rewards = quest.rewards || {};
          const showExp = rewards.experience || 0;
          const showGold = rewards.gold || 0;

          spawnParticles();

          const settleDiv = document.createElement('div');
          settleDiv.className = 'settlement-overlay';
          settleDiv.innerHTML = `
            <div class="settlement-panel win">
              <div class="settlement-title">🏆 胜利！</div>
              <div class="reward-item"><span class="reward-label">📚 熟练度</span><span class="reward-value">+${profGain}</span></div>
              ${showExp ? `<div class="reward-item"><span class="reward-label">⭐ 经验</span><span class="reward-value">+${showExp}</span></div>` : ''}
              ${showGold ? `<div class="reward-item"><span class="reward-label">💰 金币</span><span class="reward-value">+${showGold}</span></div>` : ''}
              <button class="continue-button" id="battleConfirmBtn">✅ 确认</button>
            </div>
          `;
          container.appendChild(settleDiv);
          settleDiv.querySelector('#battleConfirmBtn').addEventListener('click', () => {
            cleanup();
            questTriggerManager.completeQuest(quest.id);
          });
        }, 500);
      } else {
        addLog('💀 战斗失败...', 'defeat');
        flashScreen('rgba(244,67,54,0.2)', 400);
        turnIndicator.textContent = '💀 失败';
        turnIndicator.className = 'turn-indicator';
        setTimeout(() => {
          const settleDiv = document.createElement('div');
          settleDiv.className = 'settlement-overlay';
          settleDiv.innerHTML = `
            <div class="settlement-panel lose">
              <div class="settlement-title">💀 失败</div>
              <div style="color:#ccc;margin-bottom:20px;">不要气馁，回去自习提升后再来挑战吧！</div>
              <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
                <button class="continue-button" id="battleRetryBtn" style="flex:1;min-width:140px;">🔄 再来一次</button>
                <button class="continue-button" id="battleCloseBtn" style="flex:1;min-width:140px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:#9ca3af;">📚 回去自习</button>
              </div>
            </div>
          `;
          container.appendChild(settleDiv);
          // 重试：重置状态为 AVAILABLE 后重新启动战斗（可直接重考，无需走回任务点）
          const retryBtn = settleDiv.querySelector('#battleRetryBtn');
          if (retryBtn) {
            retryBtn.addEventListener('click', () => {
              cleanup();
              questTriggerManager.questStatus[quest.id] = QUEST_STATUS.AVAILABLE;
              questTriggerManager.activeQuest = null;
              // 重新激活任务 → quest:activated 事件会自动触发 _startBattleInline
              questTriggerManager.tryActivateQuest(quest.id);
            });
          }
          // 关闭按钮：放弃挑战，回到地图
          const closeBtn2 = settleDiv.querySelector('#battleCloseBtn');
          if (closeBtn2) {
            closeBtn2.addEventListener('click', () => {
              cleanup();
              questTriggerManager.questStatus[quest.id] = QUEST_STATUS.AVAILABLE;
              questTriggerManager.activeQuest = null;
              questTriggerUI._showToast('💡 回去自习提升吧，准备好了再来挑战', '#FF9800', 3000);
            });
          }
        }, 500);
      }
    };

    /** 清理所有 DOM */
    const cleanup = () => {
      if (screenFlash && screenFlash.parentNode) screenFlash.remove();
      if (overlay && overlay.parentNode) overlay.remove();
    };

    // ========= 绑定技能按钮 =========
    allSkills.forEach(s => {
      const btn = container.querySelector('#btn-skill-' + s.id);
      if (btn) btn.addEventListener('click', () => useSkill(s));
    });
    if (btnFlee) btnFlee.addEventListener('click', tryFlee);

    // ========= 启动 =========
    addLog('⚔️ 战斗开始！你先出手！');
  }
  
  /**
   * 启动对话任务 —— 逐条展示 DialogueConfig 中的对白内容
   */
  _startDialogueForQuest(quest) {
    
    // 获取对话内容（支持根据学院加载专属专业课程对白）
    const college = questTriggerManager.characterCollege;
    const dialogueLines = getDialogueForQuest(quest.id, college);
    
    if (!dialogueLines || dialogueLines.length === 0) {
      this._autoCompleteQuest(quest);
      return;
    }
    
    let currentIndex = 0;
    
    // 创建对话覆盖层
    const dialogueOverlay = document.createElement('div');
    dialogueOverlay.id = 'dialogue-overlay-fusion';
    dialogueOverlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      z-index: 9000; background: rgba(0, 0, 0, 0.6);
      display: flex; justify-content: center; align-items: flex-end;
    `;
    // 防止地图系统键盘事件干扰
    dialogueOverlay.setAttribute('tabindex', '0');
    dialogueOverlay.style.outline = 'none';
    
    const dialogueBox = document.createElement('div');
    dialogueBox.style.cssText = `
      background: linear-gradient(160deg, #1a1d35 0%, #12142a 40%, #1a1d35 100%);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 18px; padding: 28px; margin: 0 10% 10% 10%;
      width: 80%; max-width: 800px; min-height: 200px;
      color: #e5e7eb; font-family: 'Microsoft YaHei', sans-serif;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(12px);
      transition: opacity 0.25s;
    `;
    
    // 渲染当前对话行
    const renderLine = () => {
      const line = dialogueLines[currentIndex];
      const isLast = currentIndex >= dialogueLines.length - 1;
      const isSystem = line.speaker === '系统';
      const isCompletion = line.text.startsWith('✅');
      
      dialogueBox.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div style="font-size:16px;font-weight:700;color:var(--gold,#FFD700);">
            📖 ${quest.name}
          </div>
          <span style="font-size:11px;color:#6b7280;">${currentIndex + 1}/${dialogueLines.length}</span>
        </div>
        
        <!-- 说话人 -->
        <div style="font-size:12px;color:${isSystem ? '#6b7280' : '#60a5fa'};margin-bottom:8px;font-weight:600;">
          ${isSystem ? '—' : line.speaker}
        </div>
        
        <!-- 对话文本 -->
        <div style="
          font-size:15px;color:#e5e7eb;line-height:1.9;
          margin-bottom:22px;padding:12px 16px;
          background:${isCompletion ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.02)'};
          border-left:3px solid ${isCompletion ? '#22c55e' : 'rgba(255,255,255,0.15)'};
          border-radius:0 8px 8px 0;
        ">
          ${line.text}
        </div>
        
        <!-- 操作按钮 -->
        <div style="display:flex;gap:10px;">
          ${isLast ? `
            <button id="dialogue-complete-btn" style="
              flex:1;padding:13px;
              background:linear-gradient(135deg,#22c55e,#16a34a);
              color:#fff;border:none;border-radius:10px;
              font-size:15px;font-weight:700;cursor:pointer;
              letter-spacing:1px;box-shadow:0 4px 16px rgba(34,197,94,0.2);
            ">✅ 完成学习</button>
          ` : `
            <button id="dialogue-next-btn" style="
              flex:1;padding:13px;
              background:linear-gradient(135deg,#3b82f6,#2563eb);
              color:#fff;border:none;border-radius:10px;
              font-size:15px;font-weight:700;cursor:pointer;
              letter-spacing:1px;box-shadow:0 4px 16px rgba(59,130,246,0.2);
            ">▶ 继续</button>
          `}
          <button id="dialogue-skip-btn" style="
            padding:13px 24px;
            background:rgba(255,255,255,0.04);
            color:#9ca3af;border:1px solid rgba(255,255,255,0.08);
            border-radius:10px;font-size:14px;cursor:pointer;
          ">⏭ 跳过</button>
        </div>
      `;
      
      // 绑定按钮事件
      const nextBtn = document.getElementById('dialogue-next-btn');
      const completeBtn = document.getElementById('dialogue-complete-btn');
      const skipBtn = document.getElementById('dialogue-skip-btn');
      
      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          currentIndex++;
          renderLine();
        });
      }
      
      if (completeBtn) {
        completeBtn.addEventListener('click', () => {
          cleanup();
          questTriggerManager.completeQuest(quest.id);
        });
      }
      
      if (skipBtn) {
        skipBtn.addEventListener('click', () => {
          cleanup();
          questTriggerManager.completeQuest(quest.id);
        });
      }
    };
    
    const cleanup = () => {
      document.removeEventListener('keydown', keyHandler);
      dialogueOverlay.remove();
    };
    
    // 键盘操作：空格/回车推进对话
    const keyHandler = (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (currentIndex >= dialogueLines.length - 1) {
          cleanup();
          questTriggerManager.completeQuest(quest.id);
        } else {
          currentIndex++;
          renderLine();
        }
      }
      if (e.key === 'Escape') {
        cleanup();
        // 不完成任务，让玩家可以重新触发
        questTriggerUI._showToast('💡 对话已关闭，可重新触发本课程', '#FF9800', 3000);
      }
    };
    document.addEventListener('keydown', keyHandler);
    
    dialogueOverlay.appendChild(dialogueBox);
    document.body.appendChild(dialogueOverlay);
    
    // 渲染第一行
    renderLine();
    
    // 自动聚焦防止地图系统吞键盘事件
    setTimeout(() => dialogueOverlay.focus(), 100);
  }
  
  /**
   * 启动自习任务（图书馆/教学楼均可，可重复进行）
   */
  _startSelfStudyForQuest(quest) {
    const self = this;
    const locationName = quest.locationType === '图书馆' ? '📚 图书馆' : '🏫 教学楼';
    
    // 获取已解锁的科目列表
    const unlockedSubjects = Array.from(questTriggerManager.unlockedSubjects || []);
    if (unlockedSubjects.length === 0) {
      questTriggerUI._showToast('⚠️ 暂无已解锁的科目，请先完成课程任务解锁科目后再来自习', '#FF9800', 3500);
      return;
    }
    
    const staminaCost = quest.staminaCost || 20;
    const baseAmount = (quest.proficiencyGain?.amount || 30) * 3;
    const currentStamina = questTriggerManager.characterStats.stamina;
    const maxStamina = questTriggerManager.characterStats.maxStamina;
    const proficiencies = questTriggerManager.proficiencies || {};
    
    let selectedSubject = unlockedSubjects[0];
    const canStudy = currentStamina >= staminaCost;
    
    // 获取科目当前熟练度
    const getSubjectProf = (subj) => {
      const p = proficiencies[subj];
      if (!p) return 'Lv.1 (0点)';
      return `Lv.${p.level || 1} (${p.points || 0}点)`;
    };
    
    // ========= 面板 =========
    const studyOverlay = document.createElement('div');
    studyOverlay.id = 'study-overlay-fusion';
    studyOverlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      z-index: 9000; background: rgba(0, 0, 0, 0.6);
      display: flex; justify-content: center; align-items: center;
    `;

    const studyBox = document.createElement('div');
    studyBox.style.cssText = `
      background: linear-gradient(160deg, #1a1d35 0%, #12142a 40%, #1a1d35 100%);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px; padding: 34px 32px; width: 400px;
      color: #e5e7eb; font-family: 'Microsoft YaHei', sans-serif;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(12px);
    `;
    
    // 生成科目选项 HTML（每次 render 函数内部调用，以确保更新选中状态）
    const renderSubjectOptions = () => {
      return unlockedSubjects.map(subj => {
        const selected = subj === selectedSubject;
        return `
          <div class="study-subject-option" data-subject="${subj}" style="
            padding: 10px 14px; margin-bottom: 6px;
            background: ${selected ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)'};
            border: 1px solid ${selected ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.06)'};
            border-radius: 8px; cursor: pointer;
            display: flex; justify-content: space-between; align-items: center;
            transition: all 0.2s; font-size: 13px;
          ">
            <span style="color: ${selected ? '#60a5fa' : '#e5e7eb'}; font-weight: ${selected ? '700' : '400'};">
              ${selected ? '● ' : '○ '}${subj}
            </span>
            <span style="color: #6b7280; font-size: 11px;">${getSubjectProf(subj)}</span>
          </div>
        `;
      }).join('');
    };
    
    const render = () => {
      const prof = proficiencies[selectedSubject] || { level: 1, points: 0 };
      studyBox.innerHTML = `
        <div style="font-size: 42px; margin-bottom: 6px;">${quest.locationType === '图书馆' ? '📚' : '🏫'}</div>
        <div style="font-size: 18px; font-weight: 700; color: var(--gold, #FFD700); margin-bottom: 4px;">
          ${locationName}自习
        </div>
        <div style="font-size: 12px; color: #6b7280; margin-bottom: 16px;">
          选择科目进行自习，消耗体力提升熟练度
        </div>
        
        <!-- 科目选择 -->
        <div style="text-align: left; margin-bottom: 16px;">
          <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px; font-weight: 600;">📖 选择科目：</div>
          <div id="study-subject-list">${renderSubjectOptions()}</div>
        </div>
        
        <!-- 信息 -->
        <div style="background: rgba(255, 255, 255, 0.03); border-radius: 12px; padding: 14px; margin-bottom: 18px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px;">
            <span style="color: #6b7280;">消耗体力</span>
            <span style="color: ${canStudy ? '#4ade80' : '#f87171'};">⚡ ${staminaCost}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px;">
            <span style="color: #6b7280;">当前体力</span>
            <span style="color: #60a5fa;">⚡ ${currentStamina}/${maxStamina}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px;">
            <span style="color: #6b7280;">熟练度增益</span>
            <span style="color: var(--gold, #FFD700); font-weight: 600;">+${baseAmount} (${selectedSubject})</span>
          </div>
        </div>
        
        <div style="display: flex; gap: 10px;">
          <button id="study-start-btn" style="
            flex: 1; padding: 13px;
            background: ${canStudy ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'rgba(255,255,255,0.04)'};
            color: ${canStudy ? '#fff' : '#4b5563'};
            border: none; border-radius: 10px; font-size: 15px; font-weight: 700;
            cursor: ${canStudy ? 'pointer' : 'not-allowed'};
            letter-spacing: 1px; transition: all 0.2s;
            ${canStudy ? 'box-shadow: 0 4px 16px rgba(59,130,246,0.2);' : ''}
          " ${canStudy ? '' : 'disabled'}>${canStudy ? '📝 开始自习' : '❌ 体力不足'}</button>
          <button id="study-close-btn" style="
            padding: 13px 24px; background: rgba(255, 255, 255, 0.04);
            color: #9ca3af; border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 10px; font-size: 15px; cursor: pointer; transition: all 0.2s;
          ">关闭</button>
        </div>
      `;
      
      // 绑定科目选择点击
      const list = document.getElementById('study-subject-list');
      if (list) {
        list.querySelectorAll('.study-subject-option').forEach(opt => {
          opt.addEventListener('click', () => {
            selectedSubject = opt.dataset.subject;
            render();
          });
        });
      }
      
      // 绑定按钮
      const startBtn = document.getElementById('study-start-btn');
      const closeBtn = document.getElementById('study-close-btn');
      
      if (startBtn && canStudy) {
        startBtn.addEventListener('click', () => {
          // 扣除体力
          questTriggerManager.characterStats.stamina -= staminaCost;
          // 增加所选科目熟练度
          if (!questTriggerManager.proficiencies[selectedSubject]) {
            questTriggerManager.proficiencies[selectedSubject] = { level: 1, points: 0 };
          }
          questTriggerManager.proficiencies[selectedSubject].points += baseAmount;
          // 检查熟练度是否升级（影响PVE战斗属性）
          questTriggerManager._checkProficiencyLevelUp(selectedSubject);
          
          // 自习发放经验、金币、知识、体能收益（努力学习全面提升战斗力）
          const studyExp = 50 + Math.floor(questTriggerManager.characterStats.level * 12);
          const studyGold = 40 + Math.floor(questTriggerManager.characterStats.level * 8);
          questTriggerManager.characterStats.experience += studyExp;
          questTriggerManager.characterStats.gold += studyGold;
          questTriggerManager.characterStats.knowledge += 15;   // 提升知识 → 提高攻击力 (knowledge/5 = ATK)
          questTriggerManager.characterStats.physical += 8;     // 提升体能 → 提高生命值 (physical*5 = HP)
          questTriggerManager._checkLevelUp();
          
          // 自习可重复，不标记为完成任务
          // 只需重置任务状态为 AVAILABLE 以便再次触发
          questTriggerManager.questStatus[quest.id] = questTriggerManager.questStatus[quest.id] === 'ACTIVE' 
            ? 'AVAILABLE' : questTriggerManager.questStatus[quest.id];
          questTriggerManager.activeQuest = null;
          
          questTriggerManager._notifyListeners('character:updated', questTriggerManager.getCharacterData());
          questTriggerUI._showToast(`✅ 自习完成！${selectedSubject} 熟练度 +${baseAmount} · ❤️体+8 · 📚知+15 · ⭐+${studyExp} · 💰+${studyGold}`, '#4CAF50', 2800);
          cleanup();
        });
      }
      
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          // 关闭时也重置状态以便重复触发
          if (questTriggerManager.questStatus[quest.id] === 'ACTIVE') {
            questTriggerManager.questStatus[quest.id] = 'AVAILABLE';
            questTriggerManager.activeQuest = null;
          }
          cleanup();
        });
      }
    };
    
    const cleanup = () => {
      studyOverlay.remove();
    };
    
    studyOverlay.appendChild(studyBox);
    document.body.appendChild(studyOverlay);
    render();
  }
  
  /**
   * 自动完成任务
   */
  _autoCompleteQuest(quest) {
    questTriggerManager.autoCompleteQuest(quest.id);
  }
  
  /**
   * 启动休息任务（恢复体力）
   */
  _startRestForQuest(quest) {
    const self = this;
    const currentStamina = questTriggerManager.characterStats.stamina;
    const maxStamina = questTriggerManager.characterStats.maxStamina;
    const recoverAmount = Math.floor(maxStamina * 0.5); // 每次休息恢复50%体力
    
    // ========== 面板 ==========
    const restOverlay = document.createElement('div');
    restOverlay.id = 'rest-overlay-fusion';
    restOverlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      z-index: 9000; background: rgba(0, 0, 0, 0.6);
      display: flex; justify-content: center; align-items: center;
    `;

    const restBox = document.createElement('div');
    restBox.style.cssText = `
      background: linear-gradient(160deg, #1a1d35 0%, #12142a 40%, #1a1d35 100%);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px; padding: 34px 32px; width: 400px;
      color: #e5e7eb; font-family: 'Microsoft YaHei', sans-serif;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(12px);
    `;
    
    const render = () => {
      const currentStaminaNow = questTriggerManager.characterStats.stamina;
      restBox.innerHTML = `
        <div style="font-size: 42px; margin-bottom: 6px;">😴</div>
        <div style="font-size: 18px; font-weight: 700; color: var(--gold, #FFD700); margin-bottom: 4px;">
          寝室休息
        </div>
        <div style="font-size: 12px; color: #6b7280; margin-bottom: 16px;">
          在宿舍好好休息，恢复体力值
        </div>
        
        <!-- 体力信息 -->
        <div style="background: rgba(255, 255, 255, 0.03); border-radius: 12px; padding: 14px; margin-bottom: 18px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px;">
            <span style="color: #6b7280;">当前体力</span>
            <span style="color: #60a5fa;">⚡ ${currentStaminaNow} / ${maxStamina}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px;">
            <span style="color: #6b7280;">恢复量</span>
            <span style="color: #4ade80;">⚡ +${recoverAmount}</span>
          </div>
          <div style="width: 100%; height: 8px; background: rgba(255, 255, 255, 0.1); border-radius: 4px; margin-top: 10px; overflow: hidden;">
            <div style="height: 100%; width: ${(currentStaminaNow / maxStamina) * 100}%; background: linear-gradient(90deg, #4ade80, #22c55e); transition: width 0.3s;"></div>
          </div>
        </div>
        
        <div style="display: flex; gap: 10px;">
          <button id="rest-start-btn" style="
            flex: 1; padding: 13px;
            background: linear-gradient(135deg, #4ade80, #22c55e);
            color: #0f172a; border: none; border-radius: 10px;
            font-size: 15px; font-weight: 700; cursor: pointer;
            letter-spacing: 1px; box-shadow: 0 4px 16px rgba(34, 197, 94, 0.3);
          ">💤 开始休息</button>
          <button id="rest-close-btn" style="
            padding: 13px 24px; background: rgba(255, 255, 255, 0.04);
            color: #9ca3af; border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 10px; font-size: 15px; cursor: pointer;
            transition: all 0.2s;
          ">关闭</button>
        </div>
      `;
      
      // 绑定按钮事件
      const startBtn = document.getElementById('rest-start-btn');
      const closeBtn = document.getElementById('rest-close-btn');
      
      if (startBtn) {
        startBtn.addEventListener('click', () => {
          // 恢复体力
          questTriggerManager.characterStats.stamina = Math.min(
            maxStamina, 
            questTriggerManager.characterStats.stamina + recoverAmount
          );
          
          // 完成任务
          cleanup();
          questTriggerManager.completeQuest(quest.id);
          
          questTriggerUI._showToast(
            `😴 休息完毕，体力 +${recoverAmount}！`,
            '#4ade80',
            3000
          );
        });
      }
      
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          cleanup();
          // 不完成任务，让玩家可以重新触发
          questTriggerUI._showToast('💡 休息已取消，可再次触发', '#FF9800', 3000);
        });
      }
    };
    
    const cleanup = () => {
      restOverlay.remove();
    };
    
    // 绑定 ESC 关闭
    const keyHandler = (e) => {
      if (e.key === 'Escape') {
        cleanup();
      }
    };
    document.addEventListener('keydown', keyHandler);
    
    restOverlay.appendChild(restBox);
    document.body.appendChild(restOverlay);
    render();
    
    // 自动聚焦防止地图系统吞键盘事件
    setTimeout(() => restOverlay.focus(), 100);
  }
  
  /**
   * 注册渲染扩展
   * 在地图Canvas上绘制任务标记
   */
  _registerRenderExtension() {
    if (!this.eventBus) return;
    
    const cleanup = this.eventBus.on('render:post', (data) => {
      if (data && data.ctx && data.coordSys) {
        questTriggerUI._drawQuestMarkers(data.ctx, data.coordSys);
      }
    });
    this._cleanups.push(cleanup);
    
  }
  
  /**
   * 启动任务引导
   * 在初始化完成后，自动显示任务指引（仅文字提示，无箭头）
   */
  _startQuestGuide() {
    // 延迟一下，确保UI元素已渲染
    setTimeout(() => {
      const availableQuests = questTriggerManager.getAvailableQuests();
      const prereqMetQuests = questTriggerManager.getPrereqMetQuests();
      
      if (availableQuests.length > 0) {
        // 有可触发任务，显示提示
        questTriggerUI._showToast(
          `⚔️ ${availableQuests.length} 个任务可触发，按 E 键开始`,
          '#4CAF50',
          5000
        );
      } else {
        // 没有可触发任务，显示文字指引
        const phaseName = questTriggerManager.getCurrentPhaseName();
        const phaseQuests = questTriggerManager._getCurrentPhaseQuests();
        const firstQuest = phaseQuests[0];
        
        if (firstQuest && prereqMetQuests.length > 0) {
          // 前置已完成，需要前往地点
          const detail = questTriggerManager.getQuestDetail(prereqMetQuests[0].id);
          questTriggerUI._showToast(
            `🎯 前往 ${detail?.locationName || '任务地点'} 触发「${prereqMetQuests[0].name}」`,
            '#FF9800',
            6000
          );
        } else if (firstQuest) {
          // 第一个任务，引导前往任务地点
          const detail = questTriggerManager.getQuestDetail(firstQuest.id);
          if (detail && detail.location) {
            questTriggerUI._showToast(
              `📋 ${phaseName} · 前往 ${detail.locationName || '任务地点'} 开始「${firstQuest.name}」`,
              '#2196F3',
              6000
            );
          }
        }
        
        // 3秒后显示状态栏提示
        setTimeout(() => {
          if (questTriggerUI.statusBarEl && questTriggerUI.statusBarEl.style.display === 'none') {
            questTriggerUI._showToast(
              'J  打开任务日志',
              '#22bdd0',
              4000
            );
          }
        }, 3000);
      }
    }, 1500);
  }
  
  /**
   * 从localStorage加载角色数据
   */
  _loadCharacterFromStorage() {
    try {
      const data = localStorage.getItem('hust_world_character');
      if (data) return JSON.parse(data);
    } catch (e) {
    }
    return null;
  }
  
  /**
   * 保存角色数据
   * 优先使用 SaveManager 统一存档；回退到旧 localStorage key 保持兼容。
   */
  saveCharacterData() {
    const data = questTriggerManager.getCharacterData();
    try {
      if (typeof window !== 'undefined' && window.saveManager) {
        const snapshot = window.saveManager.buildSnapshot();
        window.saveManager.saveLocal(snapshot);
      }
      // 同时保留旧 key 兼容
      localStorage.setItem('hust_world_character', JSON.stringify(data));
    } catch (e) {
      console.warn('[FusionSystem] 保存角色数据失败:', e);
    }
  }
  
  /**
   * 创建角色（融合后的创建流程）
   */
  createCharacter(characterData) {
    this.characterData = {
      ...characterData,
      level: 1,
      experience: 0,
      knowledge: 0,
      social: 0,
      physical: 0,
      gold: 0,
      stamina: 100,
      maxStamina: 100,
      gameProgress: {
        currentPhaseIndex: 0,
        completedQuests: [],
        proficiencies: {},
        unlockedSubjects: [],
        unlockedSkills: [],
        visitedLocations: [],
        stats: {
          level: 1,
          experience: 0,
          gold: 0,
          knowledge: 0,
          social: 0,
          physical: 0,
          stamina: 100,
          maxStamina: 100
        },
        gameTime: { year: 2024, semester: 1, week: 1, day: 1, hour: 8 }
      }
    };
    
    questTriggerManager.init(this.characterData);
    this.saveCharacterData();
    
    return this.characterData;
  }
  
  /**
   * 获取可用任务列表
   */
  getAvailableQuests() {
    return questTriggerManager.getAvailableQuests();
  }
  
  /**
   * 获取任务详情
   */
  getQuestDetail(questId) {
    return questTriggerManager.getQuestDetail(questId);
  }
  
  /**
   * 获取进度摘要
   */
  getProgressSummary() {
    return questTriggerManager.getProgressSummary();
  }
  
  /**
   * 尝试触发任务
   */
  tryActivateQuest(questId) {
    return questTriggerManager.tryActivateQuest(questId);
  }
  
  /**
   * 销毁融合系统
   */
  destroy() {
    // 保存数据
    this.saveCharacterData();
    
    // 清理事件监听
    for (const cleanup of this._cleanups) {
      if (typeof cleanup === 'function') cleanup();
    }
    this._cleanups = [];
    
    // 销毁UI
    questTriggerUI.destroy();
    
    this.initialized = false;
  }
}

// 创建单例
const fusionSystem = new FusionSystem();

// 导出
export default fusionSystem;
export { FusionSystem };

// 挂载到全局作用域，供地图系统和其他模块访问
if (typeof window !== 'undefined') {
  window.fusionSystem = fusionSystem;
  window.questTriggerManager = questTriggerManager;
  window.questTriggerUI = questTriggerUI;
}
