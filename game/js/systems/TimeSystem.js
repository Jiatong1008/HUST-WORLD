/**
 * HUST World - 时间系统
 * 
 * 功能：
 * - 游戏内时间流逝（时/分/星期）
 * - 学期进度管理
 * - 活动触发机制
 * - 时间显示UI
 * - 事件订阅机制
 */

class TimeSystem {
    constructor() {
        // 时间配置
        this.REAL_TO_GAME_RATIO = 60; // 真实1秒 = 游戏60秒 = 游戏1分钟 → 真实1小时 = 游戏60分钟 = 游戏1小时
        this.DAY_START_HOUR = 6; // 一天开始于6点
        this.DAY_END_HOUR = 24; // 一天结束于24点
        
        // 游戏时间状态
    this.gameTime = {
        year: 1,
        semester: 1, // 1-2
        week: 1, // 1-18
        day: 1, // 1-7 (1=周一)
        hour: 8,
        minute: 0
    };
    
    // 运行状态
    this.isRunning = false;
    this.lastUpdateTime = 0;
    this.loopId = null;
    
    // 时间锁定状态
    this.isTimeLocked = false;
    this.lockReason = '';
    this.lockRequiredQuestId = null;
        
        // 学期进度
        this.semesterProgress = 0;
        
        // 事件系统
        this.subscribers = [];
        this.scheduledEvents = [];
        
        // Shift 键状态
        this.isShiftPressed = false;
        this.NORMAL_RATIO = 60;
        this.SHIFT_RATIO = 300;
        
        // UI元素
        this.uiElement = null;
        
        // 学期配置
        this.SEMESTER_WEEKS = 20;
        this.WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];
        this.TIME_PERIODS = [
            { start: 6, end: 8, name: '清晨' },
            { start: 8, end: 12, name: '上午' },
            { start: 12, end: 14, name: '中午' },
            { start: 14, end: 18, name: '下午' },
            { start: 18, end: 22, name: '晚上' },
            { start: 22, end: 6, name: '深夜' }
        ];
    }
    
    /**
   * 初始化时间系统
   */
  init(savedTime = null, questManager = null) {
    if (savedTime) {
      this.gameTime = { ...this.gameTime, ...savedTime };
    }
    
    this.questManager = questManager;
    this.createUI();
    this.updateUI();
    this.start();
    
    // 监听 Shift 键
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Shift' && !this.isShiftPressed) {
        this.isShiftPressed = true;
        this.REAL_TO_GAME_RATIO = this.SHIFT_RATIO;
      }
    });
    
    document.addEventListener('keyup', (e) => {
      if (e.key === 'Shift') {
        this.isShiftPressed = false;
        this.REAL_TO_GAME_RATIO = this.NORMAL_RATIO;
      }
    });
    
    console.log('[时间系统] 初始化完成:', this.getFormattedTime());
    
    return this;
  }
    
    /**
     * 开始时间流逝
     */
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastUpdateTime = Date.now();
        this.tick();
    }
    
    /**
     * 暂停时间流逝
     */
    pause() {
        this.isRunning = false;
        if (this.loopId) {
            cancelAnimationFrame(this.loopId);
            this.loopId = null;
        }
    }
    
    /**
     * 时间主循环
     */
    tick() {
        if (!this.isRunning) return;
        
        const now = Date.now();
        const delta = (now - this.lastUpdateTime) / 1000;
        
        if (delta >= 1) {
            this.advanceTime(delta);
            this.lastUpdateTime = now;
        }
        
        this.loopId = requestAnimationFrame(() => this.tick());
    }
    
    /**
   * 推进游戏时间
   * @param {number} realSeconds - 流逝的真实秒数
   */
  /**
   * 直接按分钟推进游戏时间
   */
  advanceTimeByMinutes(minutes) {
    // 检查是否被锁定
    if (this.isTimeLocked) {
      console.log('[TimeSystem] 时间已被锁定，无法推进');
      this.showToast(`⚠️ ${this.lockReason}`, '#FF9800', 3000);
      return;
    }
    
    // 保存原来的周数
    const oldWeek = this.gameTime.week;
    this.gameTime.minute += minutes;
    
    // 处理进位
    while (this.gameTime.minute >= 60) {
      this.gameTime.minute -= 60;
      this.gameTime.hour++;
      this.triggerEvent('hourChange', { hour: this.gameTime.hour });
      this.checkTimePeriodChange();
    }
    
    while (this.gameTime.hour >= 24) {
      this.gameTime.hour -= 24;
      this.gameTime.day++;
      this.triggerEvent('dayChange', { day: this.gameTime.day, weekday: this.WEEKDAYS[this.gameTime.day - 1] });
      
      // 检查是否新的一周
      if (this.gameTime.day > 7) {
        this.gameTime.day = 1;
        this.gameTime.week++;
        this.triggerEvent('weekChange', { week: this.gameTime.week });
        
        // 检查学期进度
        this.checkSemesterProgress();
        
        // 检查时间锁定
        if (this.gameTime.week !== oldWeek) {
          const lockCheck = this.checkTimeLockBeforeAdvance(this.gameTime.week);
          if (lockCheck.shouldLock) {
            // 回退到锁定的周数
            this.gameTime.week = lockCheck.lockToWeek;
            this.lockTime(lockCheck.reason, lockCheck.requiredQuestId);
            break;
          }
        }
      }
    }
    
    // 更新任务管理器的游戏时间
    if (this.questManager && this.questManager.updateGameTime) {
      this.questManager.updateGameTime(this.gameTime);
    }
    
    this.updateUI();
    this.saveTime();
  }

  // 检测是否应该锁定时间（比如军训任务未完成）
  checkTimeLockBeforeAdvance(targetWeek) {
    // 检查任务管理器是否可用
    if (!this.questManager) return { shouldLock: false };
    
    // 检查是否在第一学期的第4周开始
    if (this.gameTime.year === 1 && this.gameTime.semester === 1) {
      // 如果即将到第4周或以后，检查是否完成了军训任务
      if (targetWeek >= 4) {
        const isMilitaryTrainingCompleted = this.questManager.completedQuests && 
                                            this.questManager.completedQuests.has('military_training');
        
        if (!isMilitaryTrainingCompleted) {
          return {
            shouldLock: true,
            reason: '必须先完成军训任务！请前往操场完成军训。',
            requiredQuestId: 'military_training',
            lockToWeek: 3 // 锁定在第3周
          };
        }
      }
    }
    
    return { shouldLock: false };
  }

  // 锁定时间
  lockTime(reason, requiredQuestId) {
    this.isTimeLocked = true;
    this.lockReason = reason;
    this.lockRequiredQuestId = requiredQuestId;
    
    // 停止时间流动
    this.pause();
    
    // 显示提示
    this.showToast(`⚠️ ${reason}`, '#FF9800', 5000);
    
    // 触发事件
    this.triggerEvent('timeLocked', { reason, requiredQuestId });
    
    console.log('[TimeSystem] 时间已锁定:', reason);
  }

  // 解锁时间（当玩家完成了要求的任务时调用）
  unlockTime() {
    this.isTimeLocked = false;
    this.lockReason = '';
    this.lockRequiredQuestId = null;
    
    // 恢复时间流动
    this.start();
    
    // 触发事件
    this.triggerEvent('timeUnlocked');
    
    console.log('[TimeSystem] 时间已解锁');
  }

  advanceTime(realSeconds) {
    // 检查是否被锁定
    if (this.isTimeLocked) {
      console.log('[TimeSystem] 时间已被锁定，无法推进');
      return;
    }
    
    // 真实秒数 × 比率 = 游戏秒数，然后转换成分钟
    const gameSeconds = realSeconds * this.REAL_TO_GAME_RATIO;
    this.gameTime.minute += gameSeconds / 60;
    
    // 处理进位
    while (this.gameTime.minute >= 60) {
      this.gameTime.minute -= 60;
      this.gameTime.hour++;
      
      // 触发小时事件
      this.triggerEvent('hourChange', { hour: this.gameTime.hour });
      
      // 检查时间段变化
      this.checkTimePeriodChange();
    }
    
    while (this.gameTime.hour >= 24) {
      this.gameTime.hour -= 24;
      this.gameTime.day++;
      
      // 触发天事件
      this.triggerEvent('dayChange', { day: this.gameTime.day, weekday: this.WEEKDAYS[this.gameTime.day - 1] });
    }
    
    const oldWeek = this.gameTime.week;
    while (this.gameTime.day > 7) {
      this.gameTime.day -= 7;
      this.gameTime.week++;
      
      // 触发周事件
      this.triggerEvent('weekChange', { week: this.gameTime.week });
      
      // 检查学期进度
      this.checkSemesterProgress();
      
      // 检查时间锁定
      if (this.gameTime.week !== oldWeek) {
        const lockCheck = this.checkTimeLockBeforeAdvance(this.gameTime.week);
        if (lockCheck.shouldLock) {
          // 回退到锁定的周数
          this.gameTime.week = lockCheck.lockToWeek;
          this.lockTime(lockCheck.reason, lockCheck.requiredQuestId);
          break;
        }
      }
    }
    
    while (this.gameTime.week > this.SEMESTER_WEEKS) {
      this.gameTime.week -= this.SEMESTER_WEEKS;
      this.gameTime.semester++;
      
      if (this.gameTime.semester > 2) {
        this.gameTime.semester = 1;
        this.gameTime.year++;
      }
      
      // 触发学期事件
      this.triggerEvent('semesterChange', { semester: this.gameTime.semester, year: this.gameTime.year });
    }
    
    // 更新任务管理器的游戏时间
    if (this.questManager && this.questManager.updateGameTime) {
      this.questManager.updateGameTime(this.gameTime);
    }
    
    this.updateUI();
    this.checkScheduledEvents();
    this.saveTime();
  }
    
    /**
     * 检查时间段变化
     */
    checkTimePeriodChange() {
        const currentPeriod = this.getTimePeriod();
        if (this.lastPeriod !== currentPeriod) {
            this.lastPeriod = currentPeriod;
            this.triggerEvent('periodChange', { period: currentPeriod });
            
            // 显示时间段提示
            const message = TIME_EVENTS.PERIOD_MESSAGES[currentPeriod];
            if (message) {
                this.showToast(`🌅 ${currentPeriod}: ${message}`);
            }
            
            // 检查课程开始
            this.checkClassStart();
            
            // 检查食堂开饭
            this.checkCanteenStart();
        }
    }
    
    /**
     * 检查课程开始
     */
    checkClassStart() {
        const { hour, day } = this.gameTime;
        
        for (const [key, cls] of Object.entries(TIME_EVENTS.CLASSES)) {
            // 检查是否在该星期
            if (cls.days && !cls.days.includes(day)) continue;
            
            // 检查是否是上课开始时间
            if (hour === cls.start) {
                this.showToast(`📚 课程提醒: ${cls.name} 开始了!`);
                this.triggerEvent('classStart', { class: cls });
                break;
            }
        }
    }
    
    /**
     * 检查食堂开饭
     */
    checkCanteenStart() {
        const { hour } = this.gameTime;
        
        for (const [key, meal] of Object.entries(TIME_EVENTS.CANTEEN)) {
            if (hour === meal.start) {
                this.showToast(`🍽️ 开饭提醒: ${meal.name} 开始了!`);
                this.triggerEvent('canteenStart', { meal: meal });
                break;
            }
        }
    }
    
    /**
     * 获取当前时间段
     */
    getTimePeriod() {
        const hour = this.gameTime.hour;
        for (const period of this.TIME_PERIODS) {
            if (period.start < period.end) {
                if (hour >= period.start && hour < period.end) {
                    return period.name;
                }
            } else {
                if (hour >= period.start || hour < period.end) {
                    return period.name;
                }
            }
        }
        return '白天';
    }
    
    /**
     * 检查学期进度
     */
    checkSemesterProgress() {
        const week = this.gameTime.week;
        
        if (week === 1) {
            this.showToast('🎓 新学期开始了!祝你学业有成!');
            this.triggerEvent('semesterStart', { semester: this.gameTime.semester });
        } else if (week === 10) {
            this.showToast('📝 期中复习周到了!好好复习!');
            this.triggerEvent('midterm', { semester: this.gameTime.semester });
        } else if (week === 20) {
            this.showToast('📋 期末考试周到了!加油!');
            this.triggerEvent('finalWeek', { semester: this.gameTime.semester });
        }
        
        // 检查特殊活动
        this.checkSpecialEvents(week);
    }
    
    /**
     * 检查特殊活动
     */
    checkSpecialEvents(week) {
        for (const [key, event] of Object.entries(TIME_EVENTS.SPECIAL_EVENTS)) {
            if (event.weeks && event.weeks.includes(week)) {
                this.showToast(`✨ 活动提醒: ${event.name}`);
                this.triggerEvent('specialEvent', { event: event, key: key });
                break;
            }
        }
    }
    
    /**
   * 创建时间显示UI
   */
  createUI() {
    if (this.uiElement) return;
    
    this.uiElement = document.createElement('div');
    this.uiElement.id = 'time-display';
    this.uiElement.innerHTML = `
      <div class="time-panel" id="time-panel">
        <div class="time-header" id="time-header">
          📅 游戏时间
          <button class="collapse-btn" id="btn-collapse" title="折叠/展开">▼</button>
        </div>
        <div class="time-content" id="time-content">
          <div class="time-row">
            <span class="time-label">学年</span>
            <span class="time-value" id="time-year">第1学年</span>
          </div>
          <div class="time-row">
            <span class="time-label">学期</span>
            <span class="time-value" id="time-semester">第1学期</span>
          </div>
          <div class="time-row">
            <span class="time-label">周次</span>
            <span class="time-value" id="time-week">第1周</span>
          </div>
          <div class="time-row">
            <span class="time-label">星期</span>
            <span class="time-value" id="time-day">周一</span>
          </div>
          <div class="time-row time-row-main">
            <span class="time-value-big" id="time-clock">08:00</span>
            <span class="time-period" id="time-period">上午</span>
          </div>
          <div class="semester-progress">
            <div class="progress-label">学期进度</div>
            <div class="progress-bar">
              <div class="progress-fill" id="semester-progress"></div>
            </div>
            <div class="progress-text" id="progress-text">0%</div>
          </div>
          <!-- 时间锁定提示 -->
          <div class="time-lock-warning" id="time-lock-warning" style="display: none;">
            <div class="lock-icon">🔒</div>
            <div class="lock-message" id="lock-message">时间已锁定</div>
          </div>
        </div>
        <div class="time-controls" id="time-controls">
          <button class="time-btn" id="btn-pause-time" title="暂停时间">⏸️</button>
          <button class="time-btn" id="btn-speed-up" title="加速">⏩</button>
          <button class="time-btn" id="btn-reset-speed" title="恢复速度">⏱️</button>
          <button class="time-btn" id="btn-next-day" title="跳到下一天">⏭️+1天</button>
          <button class="time-btn" id="btn-next-week" title="跳到下一周">⏭️+1周</button>
        </div>
      </div>
      
      <!-- 菜单按钮，放在时间面板下面 -->
      <button class="menu-toggle" id="menu-toggle" title="信息面板">☰ 菜单</button>
    `;
    
    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
      #time-display {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        font-family: 'Microsoft YaHei', sans-serif;
      }
      
      .time-panel {
        background: linear-gradient(135deg, rgba(26, 29, 53, 0.95), rgba(18, 20, 42, 0.98));
        border: 2px solid rgba(255, 215, 0, 0.3);
        border-radius: 16px;
        padding: 16px;
        width: 220px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 215, 0, 0.1);
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
      }
      
      .time-panel.collapsed {
        width: 160px;
      }
      
      .time-header {
        color: #FFD700;
        font-size: 14px;
        font-weight: bold;
        text-align: center;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .collapse-btn {
        background: none;
        border: none;
        color: #FFD700;
        cursor: pointer;
        font-size: 14px;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s;
      }
      
      .collapse-btn:hover {
        background: rgba(255, 215, 0, 0.1);
      }
      
      .time-panel.collapsed .time-header {
        margin-bottom: 0;
        padding-bottom: 0;
        border-bottom: none;
      }
      
      .time-panel.collapsed .time-content,
      .time-panel.collapsed .time-controls {
        display: none;
      }
      
      .time-content {
        color: #E0E0E0;
      }
      
      .time-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 4px 0;
        font-size: 13px;
      }
      
      .time-label {
        color: #9CA3AF;
      }
      
      .time-value {
        color: #FFFFFF;
        font-weight: 500;
      }
      
      .time-row-main {
        justify-content: center;
        gap: 8px;
        padding: 8px 0;
        margin-top: 4px;
        background: rgba(255, 215, 0, 0.05);
        border-radius: 8px;
      }
      
      .time-value-big {
        font-size: 28px;
        font-weight: bold;
        color: #FFD700;
        text-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
      }
      
      .time-period {
        font-size: 12px;
        color: #9CA3AF;
        background: rgba(255, 255, 255, 0.1);
        padding: 2px 8px;
        border-radius: 4px;
      }
      
      .semester-progress {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .progress-label {
        font-size: 12px;
        color: #9CA3AF;
        margin-bottom: 6px;
      }
      
      .progress-bar {
        height: 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        overflow: hidden;
      }
      
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #D4A017, #FFD700);
        border-radius: 4px;
        transition: width 0.3s ease;
        box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
      }
      
      .progress-text {
        font-size: 11px;
        color: #9CA3AF;
        text-align: right;
        margin-top: 4px;
      }
      
      .time-controls {
        display: flex;
        gap: 8px;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        justify-content: center;
      }
      
      .time-btn {
        min-width: 36px;
        width: auto;
        padding: 0 8px;
        height: 36px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        transition: all 0.2s;
      }
      
      .time-btn:hover {
        background: rgba(255, 215, 0, 0.15);
        border-color: rgba(255, 215, 0, 0.4);
        transform: translateY(-2px);
      }
      
      .time-btn:active {
        transform: translateY(0);
      }
      
      /* 时间锁定提示样式 */
      .time-lock-warning {
        margin-top: 12px;
        padding: 10px;
        background: rgba(255, 152, 0, 0.15);
        border: 1px solid rgba(255, 152, 0, 0.4);
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .lock-icon {
        font-size: 18px;
      }
      
      .lock-message {
        color: #FF9800;
        font-size: 12px;
        flex: 1;
      }
      
      /* 菜单按钮样式 */
        .menu-toggle {
          margin-top: 12px;
          width: 100%;
          padding: 10px 16px;
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.1));
          border: 2px solid rgba(255, 215, 0, 0.4);
          border-radius: 12px;
          color: #FFD700;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          text-align: center;
        }
        
        .menu-toggle:hover {
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(255, 215, 0, 0.2));
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255, 215, 0, 0.2);
        }
        
        .menu-toggle:active {
          transform: translateY(0);
        }
        
        /* 移动端适配 */
        @media (max-width: 768px) {
          #time-display {
            top: 10px;
            right: 10px;
            transform: scale(0.9);
            transform-origin: top right;
          }
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(this.uiElement);
    
    // 绑定控制按钮
    this.bindControls();
  }
    
    /**
   * 绑定控制按钮
   */
  bindControls() {
    document.getElementById('btn-pause-time').addEventListener('click', () => {
      if (this.isRunning) {
        this.pause();
        document.getElementById('btn-pause-time').textContent = '▶️';
        document.getElementById('btn-pause-time').title = '继续时间';
      } else {
        this.start();
        document.getElementById('btn-pause-time').textContent = '⏸️';
        document.getElementById('btn-pause-time').title = '暂停时间';
      }
    });
    
    document.getElementById('btn-speed-up').addEventListener('click', () => {
      this.REAL_TO_GAME_RATIO = 300; // 5倍速，真实1秒 = 游戏5分钟
      this.showToast('⏩ 时间加速 x5');
    });
    
    document.getElementById('btn-reset-speed').addEventListener('click', () => {
      this.REAL_TO_GAME_RATIO = 60; // 恢复正常，真实1秒 = 游戏1分钟
      this.showToast('⏱️ 时间恢复正常');
    });
    
    document.getElementById('btn-next-day').addEventListener('click', () => {
      this.advanceTimeByMinutes(24 * 60 - this.gameTime.hour * 60 - this.gameTime.minute);
      this.showToast('⏭️ 已跳到下一天');
    });
    
    document.getElementById('btn-next-week').addEventListener('click', () => {
      const minutesToNextWeek = (7 - this.gameTime.day + 1) * 24 * 60 - this.gameTime.hour * 60 - this.gameTime.minute;
      this.advanceTimeByMinutes(minutesToNextWeek);
      this.showToast('⏭️ 已跳到下一周');
    });
    
    // 折叠按钮
    document.getElementById('btn-collapse').addEventListener('click', () => {
      const panel = document.getElementById('time-panel');
      const btn = document.getElementById('btn-collapse');
      
      if (panel.classList.contains('collapsed')) {
        panel.classList.remove('collapsed');
        btn.textContent = '▼';
      } else {
        panel.classList.add('collapsed');
        btn.textContent = '▶';
      }
    });
    
    // 菜单按钮
    document.getElementById('menu-toggle').addEventListener('click', () => {
      const sidePanel = document.getElementById('sidePanel');
      const panelToggle = document.getElementById('panelToggle');
      
      if (sidePanel) {
        sidePanel.classList.toggle('open');
      }
      if (panelToggle) {
        panelToggle.classList.toggle('active', sidePanel?.classList.contains('open'));
      }
    });
    
    // 隐藏原来的 panelToggle 按钮
    const oldPanelToggle = document.getElementById('panelToggle');
    if (oldPanelToggle) {
      oldPanelToggle.style.display = 'none';
    }
  }
    
    /**
     * 更新UI显示
     */
    updateUI() {
        const t = this.gameTime;
        
        document.getElementById('time-year').textContent = `第${t.year}学年`;
        document.getElementById('time-semester').textContent = `第${t.semester}学期`;
        document.getElementById('time-week').textContent = `第${t.week}周`;
        document.getElementById('time-day').textContent = `周${this.WEEKDAYS[t.day - 1]}`;
        document.getElementById('time-clock').textContent = 
            `${String(t.hour).padStart(2, '0')}:${String(Math.floor(t.minute)).padStart(2, '0')}`;
        document.getElementById('time-period').textContent = this.getTimePeriod();
        
        // 更新学期进度
        const progress = ((t.week - 1) / this.SEMESTER_WEEKS) * 100;
        const semesterProgress = document.getElementById('semester-progress');
        if (semesterProgress) semesterProgress.style.width = `${progress}%`;
        const progressText = document.getElementById('progress-text');
        if (progressText) progressText.textContent = `${Math.round(progress)}%`;
        
        // 更新时间锁定提示
        const lockWarning = document.getElementById('time-lock-warning');
        const lockMessage = document.getElementById('lock-message');
        if (lockWarning) {
          if (this.isTimeLocked) {
            lockWarning.style.display = 'flex';
            if (lockMessage) lockMessage.textContent = this.lockReason;
          } else {
            lockWarning.style.display = 'none';
          }
        }
    }
    
    /**
     * 获取格式化的时间字符串
     */
    getFormattedTime() {
        const t = this.gameTime;
        return `${t.year}年第${t.semester}学期 第${t.week}周 周${this.WEEKDAYS[t.day - 1]} ${String(t.hour).padStart(2, '0')}:${String(Math.floor(t.minute)).padStart(2, '0')}`;
    }
    
    /**
     * 获取当前时间对象
     */
    getTime() {
        return { ...this.gameTime };
    }
    
    /**
     * 设置时间
     */
    setTime(timeData) {
        this.gameTime = { ...this.gameTime, ...timeData };
        this.updateUI();
        this.saveTime();
        
        // 更新任务管理器的游戏时间
        if (this.questManager && this.questManager.updateGameTime) {
            this.questManager.updateGameTime(this.gameTime);
        }
    }
    
    /**
     * 设置任务管理器引用（供外部调用）
     */
    setQuestManager(questManager) {
        this.questManager = questManager;
    }
    
    /**
     * 跳转到指定时间
     */
    skipTo(hour, minute = 0) {
        this.gameTime.hour = hour;
        this.gameTime.minute = minute;
        this.updateUI();
        this.triggerEvent('timeSkip', { to: { hour, minute } });
        this.saveTime();
    }
    
    /**
     * 跳过n天
     */
    skipDays(days) {
        this.gameTime.day += days;
        this.advanceTime(0); // 触发进位处理
        this.triggerEvent('timeSkip', { days });
    }
    
    /**
     * 订阅时间事件
     * @param {string} event - 事件类型
     * @param {Function} callback - 回调函数
     */
    subscribe(event, callback) {
        this.subscribers.push({ event, callback });
    }
    
    /**
     * 取消订阅
     */
    unsubscribe(callback) {
        this.subscribers = this.subscribers.filter(s => s.callback !== callback);
    }
    
    /**
     * 触发事件
     */
    triggerEvent(event, data) {
        this.subscribers
            .filter(s => s.event === event || s.event === '*')
            .forEach(s => {
                try {
                    s.callback(event, { ...data, time: this.getTime() });
                } catch (e) {
                    console.error('[时间系统] 事件回调错误:', e);
                }
            });
    }
    
    /**
     * 计划定时事件
     * @param {Object} condition - 条件 { week, day, hour, minute }
     * @param {Function} callback - 回调
     * @param {string} id - 事件ID
     */
    scheduleEvent(condition, callback, id = null) {
        this.scheduledEvents.push({
            id: id || Date.now().toString(),
            condition,
            callback,
            triggered: false
        });
    }
    
    /**
     * 检查定时事件
     */
    checkScheduledEvents() {
        const t = this.gameTime;
        
        this.scheduledEvents.forEach(event => {
            if (event.triggered) return;
            
            const c = event.condition;
            let match = true;
            
            if (c.week !== undefined && c.week !== t.week) match = false;
            if (c.day !== undefined && c.day !== t.day) match = false;
            if (c.hour !== undefined && c.hour !== Math.floor(t.hour)) match = false;
            if (c.minute !== undefined && c.minute !== Math.floor(t.minute)) match = false;
            
            if (match) {
                event.triggered = true;
                try {
                    event.callback(t);
                } catch (e) {
                    console.error('[时间系统] 定时事件错误:', e);
                }
            }
        });
        
        // 清理已触发的一次性事件
        this.scheduledEvents = this.scheduledEvents.filter(e => !e.triggered || e.repeat);
    }
    
    /**
     * 保存时间到本地存储
     */
    saveTime() {
        try {
            localStorage.setItem('hust_world_time', JSON.stringify(this.gameTime));
        } catch (e) {
            console.warn('[时间系统] 保存时间失败:', e);
        }
    }
    
    /**
     * 从本地存储加载时间
     */
    loadTime() {
        try {
            const data = localStorage.getItem('hust_world_time');
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            console.warn('[时间系统] 加载时间失败:', e);
        }
        return null;
    }
    
    /**
     * 显示Toast提示
     */
    showToast(message) {
        // 如果有questTriggerUI则使用它的toast，否则创建简单的
        if (window.questTriggerUI && window.questTriggerUI._showToast) {
            window.questTriggerUI._showToast(message, '#FFD700', 2000);
        } else {
            const toast = document.createElement('div');
            toast.textContent = message;
            toast.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.8);
                color: #FFD700;
                padding: 12px 24px;
                border-radius: 8px;
                font-family: 'Microsoft YaHei', sans-serif;
                z-index: 10000;
                animation: fadeInOut 2s ease forwards;
            `;
            
            const style = document.createElement('style');
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
                    20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
                }
            `;
            
            document.head.appendChild(style);
            document.body.appendChild(toast);
            
            setTimeout(() => toast.remove(), 2000);
        }
    }
    
    /**
     * 销毁时间系统
     */
    destroy() {
        this.pause();
        if (this.uiElement) {
            this.uiElement.remove();
        }
        this.subscribers = [];
        this.scheduledEvents = [];
    }
}

// 导出为全局对象
window.timeSystem = new TimeSystem();
