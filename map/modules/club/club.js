/**
 * 社团系统模块
 * 
 * 功能：
 *   - 社团列表展示
 *   - 百团大战期间加入社团
 *   - 社团任务管理
 *   - 退出社团
 */

class ClubModule {
  constructor(apiBase) {
    this.apiBase = apiBase;
    this.clubs = [];
    this.characterClubs = [];
    this.characterClubTasks = [];
    this.selectedClub = null;
    this.currentView = 'list';
    this.recruitmentStatus = null;
    this.container = null;
    this._showTimer = null;
  }

  async init() {
    await this.loadData();
    this.setupUI();
  }

  async loadData() {
    try {
      this.clubs = await this.fetch('/clubs');
      this.characterClubs = await this.fetch('/clubs/character/1');
      this.characterClubTasks = await this.fetch('/clubs/character/1/tasks');
      // 使用真实的游戏时间来检查招募状态
      const gameTime = this.getGameTime();
      this.recruitmentStatus = await this.fetch('/clubs/recruitment/status?gameTime=' + encodeURIComponent(JSON.stringify(gameTime)));
      
      // 更新任务管理器中的社团任务
      if (window.questTriggerManager) {
        window.questTriggerManager.setClubTasks(this.characterClubTasks);
      }
    } catch (error) {
      console.error('加载社团数据失败:', error);
    }
  }

  async fetch(path, options = {}) {
    const response = await fetch(this.apiBase + path, options);
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    return await response.json();
  }

  getGameTime() {
    if (window.timeSystem && typeof window.timeSystem.getTime === 'function') {
      const time = window.timeSystem.getTime();
      return {
        year: time.year || 1,
        month: time.month || 9,
        semester: time.semester || 1,
        week: time.week || 1,
        grade: time.year || 1 // 使用年份作为年级
      };
    }
    // 回退到默认值
    return {
      year: 1,
      month: 9,
      semester: 1,
      week: 1,
      grade: 1
    };
  }

  getPlayerPosition() {
    return null;
  }

  escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  getTaskDetails(task) {
    if (task.task_details && typeof task.task_details === 'object') return task.task_details;
    if (typeof task.description !== 'string') return null;
    try {
      const parsed = JSON.parse(task.description);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }

  setupUI() {
    const container = document.createElement('div');
    container.id = 'club-container';
    document.body.appendChild(container);
    this.container = container;
    this.render();
  }

  show() {
    if (this._showTimer) clearTimeout(this._showTimer);
    this.container.style.display = 'block';
    void this.container.offsetWidth;
    this.container.classList.add('visible');
    // 立即用缓存数据渲染，避免空白等待
    this.render();
    // 后台静默刷新数据
    this.loadData().then(() => requestAnimationFrame(() => this.render()));
  }

  hide() {
    this.container.classList.remove('visible');
    this._showTimer = setTimeout(() => {
      this.container.style.display = 'none';
    }, 250);
  }

  render() {
    this.container.innerHTML = '';
    
    // 标题
    const title = document.createElement('h2');
    title.className = 'club-title';
    title.textContent = '🏛️ 社团系统';
    this.container.appendChild(title);

    // 状态栏
    const statusBar = document.createElement('div');
    statusBar.className = `club-status-bar ${this.recruitmentStatus?.isRecruitment ? 'active' : 'inactive'}`;
    statusBar.textContent = this.recruitmentStatus?.isRecruitment
      ? this.recruitmentStatus.message
      : '⏰ 百团大战暂未开始（军训结束后/大二第一学期一个月后）';
    this.container.appendChild(statusBar);

    // 标签栏
    const tabs = document.createElement('div');
    tabs.className = 'club-tabs';
    
    const views = [
      { key: 'list', label: '所有社团' },
      { key: 'myClubs', label: '我的社团' },
      { key: 'tasks', label: '我的任务' }
    ];

    views.forEach(view => {
      const btn = document.createElement('button');
      btn.textContent = view.label;
      btn.className = `club-tab-btn ${this.currentView === view.key ? 'active' : ''}`;
      btn.addEventListener('click', () => {
        this.currentView = view.key;
        this.selectedClub = null;
        this.render();
      });
      tabs.appendChild(btn);
    });
    this.container.appendChild(tabs);

    // 内容区
    const content = document.createElement('div');
    content.className = 'club-content';
    
    switch (this.currentView) {
      case 'list':
        this._renderClubListTo(content);
        break;
      case 'myClubs':
        this._renderMyClubsTo(content);
        break;
      case 'tasks':
        if (this.selectedClub) {
          content.innerHTML = '<p style="text-align:center;color:#8899aa;padding:30px;">任务加载中...</p>';
          this.renderClubTasks(this.selectedClub).then(html => {
            if (!this.selectedClub) return;
            content.innerHTML = html;
            this.bindTaskButtons();
          });
        } else {
          this._renderMyTasksTo(content);
        }
        break;
    }
    
    this.container.appendChild(content);

    // 关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.className = 'club-close-btn';
    closeBtn.innerHTML = '✕';
    closeBtn.addEventListener('click', () => this.hide());
    this.container.appendChild(closeBtn);

    setTimeout(() => this.bindTaskButtons(), 0);
  }

  bindTaskButtons() {
    if (!this.container) return;

    console.log('[ClubModule] 绑定任务按钮...');
    
    this.container.querySelectorAll('.club-accept-task-btn').forEach(btn => {
      console.log('[ClubModule] 找到接取按钮，data:', btn.dataset);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('[ClubModule] 接取按钮点击，data:', e.currentTarget.dataset);
        const clubTaskId = e.currentTarget.dataset.clubTaskId;
        console.log('[ClubModule] 获取到的clubTaskId:', clubTaskId);
        this.acceptTask(clubTaskId);
      }, { once: true });
    });

    this.container.querySelectorAll('.club-complete-task-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const characterClubTaskId = e.currentTarget.dataset.characterClubTaskId;
        this.completeTask(characterClubTaskId);
      }, { once: true });
    });
    
    console.log('[ClubModule] 按钮绑定完成');
  }

  _renderClubListTo(container) {
    if (this.clubs.length === 0) {
      container.innerHTML = '<div class="club-empty">暂无社团数据</div>';
      return;
    }

    this.clubs.forEach(club => {
      const isMember = this.characterClubs.some(c => c.club_id === club.club_id);
      const canJoin = this.recruitmentStatus?.isRecruitment && !isMember;
      
      let btnHtml = '';
      if (isMember) {
        btnHtml = '<button class="club-btn green" disabled style="opacity:0.7;cursor:default;">已加入</button>';
      } else if (canJoin) {
        btnHtml = `<button class="club-btn green club-join-btn" data-club-id="${club.club_id}">加入</button>`;
      } else {
        btnHtml = '<button class="club-btn gray" disabled>暂不可加入</button>';
      }

      container.innerHTML += `
        <div class="club-card ${isMember ? 'member' : ''}">
          <div class="club-card-row">
            <div class="club-card-name">
              <span class="club-card-icon">${club.club_icon || '🏠'}</span>
              <span class="club-card-title">${this.escapeHtml(club.club_name)}</span>
            </div>
            ${btnHtml}
          </div>
          <div class="club-card-desc">${this.escapeHtml(club.description)}</div>
        </div>
      `;
    });

    setTimeout(() => {
      this.container.querySelectorAll('.club-join-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const clubId = parseInt(e.target.dataset.clubId);
          this.handleJoin(clubId);
        });
      });
    }, 0);
  }

  _renderMyClubsTo(container) {
    if (this.characterClubs.length === 0) {
      container.innerHTML = `
        <div class="club-empty">
          你还没有加入任何社团<br>
          <span style="color:#ff9800;">${this.recruitmentStatus?.isRecruitment ? '现在可以加入社团！' : '百团大战期间可以加入社团'}</span>
        </div>
      `;
      return;
    }

    this.characterClubs.forEach(membership => {
      container.innerHTML += `
        <div class="club-card">
          <div class="club-card-row">
            <div class="club-card-name">
              <span class="club-card-icon">${membership.club_icon || '🏠'}</span>
              <span class="club-card-title">${this.escapeHtml(membership.club_name)}</span>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="club-btn blue club-view-tasks-btn" data-club-id="${membership.club_id}" data-club-name="${membership.club_name}" data-club-icon="${membership.club_icon}">查看任务</button>
              <button class="club-btn red club-quit-btn" data-character-club-id="${membership.character_club_id}">退出</button>
            </div>
          </div>
          <div class="club-card-desc">加入时间：${new Date(membership.joined_at).toLocaleDateString()}</div>
        </div>
      `;
    });

    setTimeout(() => {
      this.container.querySelectorAll('.club-view-tasks-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const clubId = parseInt(e.target.dataset.clubId);
          const clubName = e.target.dataset.clubName;
          const clubIcon = e.target.dataset.clubIcon;
          this.viewTasks(clubId, clubName, clubIcon);
        });
      });
      this.container.querySelectorAll('.club-quit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const characterClubId = parseInt(e.target.dataset.characterClubId);
          this.handleQuit(characterClubId, e.target);
        });
      });
    }, 0);
  }

  _renderMyTasksTo(container) {
    if (this.selectedClub) {
      container.innerHTML = this.renderClubTasks(this.selectedClub);
      return;
    }

    if (this.characterClubTasks.length === 0) {
      container.innerHTML = '<div class="club-empty">你还没有接受任何社团任务</div>';
      return;
    }

    const tasksByClub = {};
    this.characterClubTasks.forEach(task => {
      if (!tasksByClub[task.club_id]) {
        tasksByClub[task.club_id] = [];
      }
      tasksByClub[task.club_id].push(task);
    });

    for (const [clubId, tasks] of Object.entries(tasksByClub)) {
      const club = this.clubs.find(c => c.club_id == clubId);
      const clubName = club ? club.club_name : '未知社团';
      const clubIcon = club ? club.club_icon : '🏠';

      container.innerHTML += `<h3 class="club-section-title">${clubIcon} ${clubName}</h3>`;
      
      tasks.forEach(task => {
        container.innerHTML += this._renderTaskItemHtml(task);
      });
    }
  }

  async renderClubTasks(club) {
    const gameTime = this.getGameTime();
    const tasks = await this.fetch(`/clubs/${club.id}/tasks?characterId=1&gameTime=${encodeURIComponent(JSON.stringify(gameTime))}`);
    
    if (tasks.length === 0) {
      return `<div class="club-empty">${club.icon} ${club.name} 暂时没有任务</div>`;
    }

    const taskTypes = {
      'team_building': { name: '团建任务', color: '#FF9800' },
      'daily': { name: '日常任务', color: '#4CAF50' },
      'performance': { name: '演出任务', color: '#E91E63' },
      'competition': { name: '比赛任务', color: '#9C27B0' },
      'recruitment': { name: '招新任务', color: '#2196F3' },
      'exit_ceremony': { name: '退出仪式', color: '#FF5722' }
    };

    const tasksByType = {};
    tasks.forEach(task => {
      if (!tasksByType[task.task_type]) {
        tasksByType[task.task_type] = [];
      }
      tasksByType[task.task_type].push(task);
    });

    let html = `<h3 class="club-section-title">${club.icon} ${club.name} 任务列表</h3>`;
    if (club.publisherName) {
      html += `<p class="club-subtitle">发布人：${club.publisherName} · 世界时间：${gameTime.year}年${gameTime.month}月</p>`;
    }
    
    for (const [type, typeInfo] of Object.entries(taskTypes)) {
      if (tasksByType[type]) {
        html += `<h4 style="color:${typeInfo.color};margin:16px 0 8px;font-size:13px;">${typeInfo.name}</h4>`;
        tasksByType[type].forEach(task => {
          html += this._renderTaskItemHtml(task, true);
        });
      }
    }

    return html;
  }

  _renderTaskItemHtml(task, showAccept = false) {
    const isCompleted = task.status === 'completed';
    const isAccepted = !!task.status;
    const stateClass = isCompleted ? 'completed' : (isAccepted ? 'accepted' : '');
    const canAccept = showAccept && task.canAccept !== false;
    const details = this.getTaskDetails(task);
    const description = details?.summary || task.description || '';
    const completionLabel = details?.completionMode === 'talk' ? '找人确认' : (details?.completionMode === 'checkin' ? '地点打卡' : '面板确认');

    let rewardText = '';
    if (task.reward) {
      const reward = typeof task.reward === 'string' ? JSON.parse(task.reward) : task.reward;
      const rewards = [];
      if (reward.money) rewards.push(`💰${reward.money}`);
      if (reward.experience) rewards.push(`✨${reward.experience}`);
      if (reward.social) rewards.push(`🤝${reward.social}`);
      if (reward.physical) rewards.push(`💪${reward.physical}`);
      rewardText = rewards.join(' ');
    }

    const detailsHtml = details ? `
      <div class="club-task-details">
        <div><strong>任务对象：</strong>${this.escapeHtml(details.contactNpcName || '任务 NPC')}</div>
        <div><strong>任务地点：</strong>${this.escapeHtml(details.targetLocation || '指定地点')}</div>
        <div><strong>完成方式：</strong>${this.escapeHtml(completionLabel)}</div>
        ${Array.isArray(details.flow) && details.flow.length ? `
          <ol style="margin:6px 0 0 18px;padding:0;">
            ${details.flow.map(step => `<li>${this.escapeHtml(step)}</li>`).join('')}
          </ol>
        ` : ''}
      </div>
    ` : '';

    let actionHtml = '';
    if (isCompleted) {
      actionHtml = '<span class="club-task-badge" style="background:rgba(76,175,80,0.2);color:#66BB6A;">已完成</span>';
    } else if (isAccepted) {
      actionHtml = `<button class="club-btn blue small club-complete-task-btn" data-character-club-task-id="${task.character_club_task_id}">${completionLabel}完成</button>`;
    } else if (showAccept && canAccept) {
      actionHtml = `<button class="club-btn green small club-accept-task-btn" data-club-task-id="${task.club_task_id}">接受发布</button>`;
    } else if (showAccept && !canAccept) {
      actionHtml = '<span class="club-task-badge" style="background:rgba(255,255,255,0.06);color:#8899aa;">暂不可发布</span>';
    }

    return `
      <div class="club-task-card ${stateClass}">
        <div class="club-task-row">
          <div>
            <span class="club-task-name">${this.escapeHtml(task.task_name)}</span>
            <span class="club-task-meta">难度：${this.escapeHtml(task.difficulty)}</span>
            ${task.grade_limit ? `<span class="club-task-meta" style="color:${task.canAccept === false ? '#ff5252' : '#8899aa'};">需要${task.grade_limit}年级以上</span>` : ''}
          </div>
          ${actionHtml}
        </div>
        <div class="club-task-desc">${this.escapeHtml(description)}</div>
        ${detailsHtml}
        ${task.unavailable_reason ? `<div class="club-task-desc" style="color:#ffb36b;">限制：${this.escapeHtml(task.unavailable_reason)}</div>` : ''}
        ${rewardText ? `<div class="club-task-reward">奖励：${rewardText}</div>` : ''}
      </div>
    `;
  }

  async handleJoin(clubId) {
    const club = this.clubs.find(c => c.club_id === clubId);
    // 立即反馈：按钮变灰
    const btn = this.container.querySelector(`.club-join-btn[data-club-id="${clubId}"]`);
    if (btn) { btn.disabled = true; btn.textContent = '加入中...'; }
    
    try {
      const result = await this.fetch('/clubs/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: 1, clubId, gameTime: { semester: 1, week: 1, grade: 1 } })
      });

      if (result.canJoin) {
        this._showToast(`成功加入 ${club.club_icon} ${club.club_name}！`, '#4CAF50');
        await this.loadData();
        requestAnimationFrame(() => this.render());
      } else {
        this._showToast(result.error || '加入失败', '#EF5350');
        if (btn) { btn.disabled = false; btn.textContent = '加入'; }
      }
    } catch (error) {
      this._showToast('加入失败', '#EF5350');
      if (btn) { btn.disabled = false; btn.textContent = '加入'; }
    }
  }

  async handleQuit(characterClubId, btn) {
    // 双击确认代替阻塞式 confirm()
    if (btn && btn.dataset.confirming !== 'true') {
      btn.dataset.confirming = 'true';
      btn.textContent = '再点确认';
      btn.style.background = 'linear-gradient(135deg, #D32F2F, #B71C1C)';
      setTimeout(() => {
        if (btn) {
          btn.dataset.confirming = 'false';
          btn.textContent = '退出';
          btn.style.background = '';
        }
      }, 2500);
      return;
    }
    if (btn) { btn.disabled = true; btn.textContent = '退出中...'; }

    try {
      await this.fetch('/clubs/quit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterClubId })
      });

      this._showToast('已退出社团', '#FF9800');
      await this.loadData();
      requestAnimationFrame(() => this.render());
    } catch (error) {
      this._showToast('退出失败', '#EF5350');
      if (btn) { btn.disabled = false; btn.textContent = '退出'; }
    }
  }

  viewTasks(clubId, clubName, clubIcon) {
    this.selectedClub = { id: clubId, name: clubName, icon: clubIcon };
    this.currentView = 'tasks';
    this.render();
  }

  async openTaskPublisher(clubId, publisherName = '任务发布员') {
    await this.loadData();
    const club = this.clubs.find(c => c.club_id === clubId);
    this.selectedClub = {
      id: clubId,
      name: club?.club_name || '社团',
      icon: club?.club_icon || '🏠',
      publisherName,
    };
    this.currentView = 'tasks';
    this.show();
  }

  async acceptTask(clubTaskId) {
    console.log('[ClubModule] 接取任务，原始ID:', clubTaskId, '类型:', typeof clubTaskId);
    const btn = this.container.querySelector(`.club-accept-task-btn[data-club-task-id="${clubTaskId}"]`);
    if (btn) { btn.disabled = true; btn.textContent = '接受中...'; }
    try {
      // 确保clubTaskId是数字类型
      const requestBody = { 
        characterId: 1, 
        clubTaskId: Number(clubTaskId), 
        gameTime: this.getGameTime() 
      };
      console.log('[ClubModule] 发送请求:', requestBody);
      
      await this.fetch('/clubs/tasks/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      this._showToast('任务已接受！', '#4CAF50');
      await this.loadData();
      this._refreshQuestLog();
      requestAnimationFrame(() => this.render());
    } catch (error) {
      console.error('[ClubModule] 接取任务失败:', error);
      this._showToast(error.message || '接受任务失败', '#EF5350');
      if (btn) { btn.disabled = false; btn.textContent = '接受发布'; }
    }
  }

  _refreshQuestLog() {
    if (window.questTriggerManager && this.characterClubTasks) {
      window.questTriggerManager.setClubTasks(this.characterClubTasks);
    }
    // 刷新任务日志UI
    if (window.questTriggerUI) {
      const statusBarEl = document.getElementById('quest-status-bar');
      if (statusBarEl && statusBarEl.style.display !== 'none') {
        window.questTriggerUI._renderStatusBar();
      }
    }
  }

  async completeTask(characterClubTaskId) {
    const btn = this.container.querySelector(`.club-complete-task-btn[data-character-club-task-id="${characterClubTaskId}"]`);
    if (btn) { btn.disabled = true; btn.textContent = '完成中...'; }
    try {
      const result = await this.fetch('/clubs/tasks/complete', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterClubTaskId,
          currentPosition: this.getPlayerPosition?.(),
        })
      });

      let rewardText = '';
      if (result.reward) {
        const rewards = [];
        if (result.reward.money) rewards.push(`💰${result.reward.money}`);
        if (result.reward.experience) rewards.push(`✨${result.reward.experience}`);
        if (result.reward.social) rewards.push(`🤝${result.reward.social}`);
        if (result.reward.physical) rewards.push(`💪${result.reward.physical}`);
        rewardText = rewards.join(' ');
      }

      this._showToast(`任务完成！获得奖励：${rewardText}`, '#4CAF50');
      await this.loadData();
      this._refreshQuestLog();
      requestAnimationFrame(() => this.render());
    } catch (error) {
      this._showToast(error.message || '完成任务失败', '#EF5350');
      if (btn) { btn.disabled = false; btn.textContent = '面板确认完成'; }
    }
  }

  /** 轻量 toast 替代 alert */
  _showToast(message, bgColor = '#4CAF50') {
    const existing = document.getElementById('club-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'club-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
      padding: 10px 24px; border-radius: 10px; color: #fff; font-size: 14px;
      font-weight: 600; z-index: 10000; background: ${bgColor};
      box-shadow: 0 8px 24px rgba(0,0,0,0.3); pointer-events: none;
      animation: clubToastIn 0.3s ease, clubToastOut 0.3s 2s ease forwards;
      font-family: 'PingFang SC','Microsoft YaHei',sans-serif;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2400);
  }
}

/* toast 动画（注入一次即可） */
if (typeof document !== 'undefined' && !document.getElementById('club-toast-style')) {
  const s = document.createElement('style');
  s.id = 'club-toast-style';
  s.textContent = `
    @keyframes clubToastIn  { from { opacity:0; transform:translateX(-50%) translateY(-12px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
    @keyframes clubToastOut { from { opacity:1; transform:translateX(-50%) translateY(0); } to { opacity:0; transform:translateX(-50%) translateY(-12px); } }
  `;
  document.head.appendChild(s);
}

export default ClubModule;
