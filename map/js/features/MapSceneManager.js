import { getNpcsBySceneId } from '../../../game/js/config/NpcConfig.js';
import { QUEST_STATUS } from '../../../game/js/config/QuestTriggerConfig.js';
import { imageManager } from '../ImageManager.js';

const STATUS_LABELS = {
  [QUEST_STATUS.LOCKED]: '未解锁',
  [QUEST_STATUS.LOCATION_REACHED]: '未解锁',
  [QUEST_STATUS.PREREQ_MET]: '可接取',
  [QUEST_STATUS.AVAILABLE]: '可接取',
  [QUEST_STATUS.ACTIVE]: '进行中',
  [QUEST_STATUS.READY_TO_COMPLETE]: '可交付',
  [QUEST_STATUS.COMPLETED]: '已完成',
  [QUEST_STATUS.FAILED]: '失败',
  [QUEST_STATUS.EXPIRED]: '已过期'
};

const STATUS_COLORS = {
  [QUEST_STATUS.LOCKED]: '#64748b',
  [QUEST_STATUS.LOCATION_REACHED]: '#64748b',
  [QUEST_STATUS.PREREQ_MET]: '#4ade80',
  [QUEST_STATUS.AVAILABLE]: '#4ade80',
  [QUEST_STATUS.ACTIVE]: '#60a5fa',
  [QUEST_STATUS.READY_TO_COMPLETE]: '#fbbf24',
  [QUEST_STATUS.COMPLETED]: '#9ca3af',
  [QUEST_STATUS.FAILED]: '#f87171',
  [QUEST_STATUS.EXPIRED]: '#f87171'
};

class MapSceneManager {
  constructor() {
    this.currentSceneId = 'campus';
    this.overlayEl = null;
    this.initialized = false;
  }

  init() {
    this._ensureOverlay();
    this._restoreScene();
    this.initialized = true;
    window.mapSceneManager = this;
  }

  _ensureOverlay() {
    if (document.getElementById('map-scene-overlay')) return;
    this.overlayEl = document.createElement('div');
    this.overlayEl.id = 'map-scene-overlay';
    this.overlayEl.className = 'hw-panel';
    this.overlayEl.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: linear-gradient(160deg, rgba(15,23,42,1) 0%, rgba(24,34,49,1) 100%), radial-gradient(circle at 20% 20%, rgba(30,111,223,.06), transparent 40%), radial-gradient(circle at 80% 80%, rgba(245,197,66,.04), transparent 40%);
      border: 0;
      border-radius: 0;
      color: #e5e7eb;
      z-index: 8000;
      display: none;
      flex-direction: column;
      font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
      overflow-y: auto;
      box-shadow: none;
    `;
    document.body.appendChild(this.overlayEl);
  }

  _restoreScene() {
    const sm = this._getSaveManager?.();
    if (sm) {
      const saved = sm.getProgress?.()?.currentSceneId;
      if (saved && saved !== 'campus') {
        this.currentSceneId = saved;
        this.enterScene(saved, true);
      }
    }
  }

  _getSaveManager() {
    return window.saveManager || (window.gameSystem?.saveManager);
  }

  _saveScene() {
    const sm = this._getSaveManager();
    if (sm) sm.setProgressField?.('currentSceneId', this.currentSceneId);
  }

  enterScene(sceneId, silent = false) {
    if (!this.overlayEl) this._ensureOverlay();
    this.currentSceneId = sceneId;
    this._saveScene();

    if (sceneId === 'campus') {
      this._hideOverlay();
      return;
    }

    const scene = this._getSceneData(sceneId);
    this._renderScene(scene);
    this._showOverlay();

    if (!silent) {
      this._showToast(`进入：${scene.name}`, 'info');
    }
  }

  returnToCampus() {
    this.currentSceneId = 'campus';
    this._saveScene();
    this._hideOverlay();
    this._showToast('返回校园', 'info');
  }

  _showOverlay() {
    this.overlayEl.style.display = 'flex';
    const canvas = document.getElementById('gameCanvas');
    if (canvas) canvas.style.display = 'none';
    const ui = document.getElementById('ui-layer');
    if (ui) ui.style.display = 'none';
  }

  _hideOverlay() {
    this.overlayEl.style.display = 'none';
    const canvas = document.getElementById('gameCanvas');
    if (canvas) canvas.style.display = 'block';
    const ui = document.getElementById('ui-layer');
    if (ui) ui.style.display = 'block';
  }

  _getSceneData(sceneId) {
    const npcs = getNpcsBySceneId(sceneId).map(n => ({
      npcId: n.npcId,
      name: n.name,
      title: n.title || 'NPC',
      role: n.role || 'NPC',
      avatar: n.avatar,
      fallbackAvatar: n.fallbackAvatar
    }));
    const scenes = {
      library_inside: {
        name: '图书馆室内',
        description: '安静的自习区，书香弥漫。这里可以提升知识、完成自习相关任务。',
        tasks: ['self_study_library_1', 'self_study_library_2', 'self_study_library_3', 'explore_library_corner'],
        npcs: npcs.length ? npcs : [{ name: '图书管理员', title: '学习助手', role: 'librarian', npcId: null }]
      },
      dorm_inside: {
        name: '宿舍室内',
        description: '温馨的小窝，休息和整理的好地方。适合恢复体力、查看学期总结。',
        tasks: ['rest_dorm_1', 'freshman_1_summary', 'freshman_2_summary', 'sophomore_1_summary', 'sophomore_2_summary', 'junior_1_summary', 'junior_2_summary', 'senior_1_summary', 'senior_2_summary'],
        npcs: npcs.length ? npcs : [{ name: '室友', title: '生活伙伴', role: 'student', npcId: null }]
      },
      classroom_inside: {
        name: '教学楼室内',
        description: '课堂与考试的主战场。在这里上课、考试、推进课程任务。',
        tasks: ['math_intro', 'second_class_math', 'second_class_probability', 'major_course_1', 'major_course_2', 'major_course_3', 'major_course_4'],
        npcs: npcs.length ? npcs : [{ name: '教授', title: '课程讲师', role: 'teacher', npcId: null }]
      },
      club_center_inside: {
        name: '社团活动中心',
        description: '社团招新、活动和项目协作的地方。加入社团、参与活动都在这里。',
        tasks: ['club_join', 'club_first_activity', 'club_project', 'club_leader', 'club_farewell'],
        npcs: npcs.length ? npcs : [{ name: '社团骨干', title: '社团负责人', role: 'club', npcId: null }]
      },
      lab_inside: {
        name: '实验室',
        description: '科研与实验的空间。完成实验探索、提升实践能力。',
        tasks: ['explore_lab'],
        npcs: npcs.length ? npcs : [{ name: '实验员', title: '科研指导', role: 'mentor', npcId: null }]
      },
      canteen_inside: {
        name: '食堂',
        description: '补充体力和解锁隐藏菜单的好地方。用餐可以恢复体能。',
        tasks: ['explore_canteen_secret'],
        npcs: npcs.length ? npcs : [{ name: '食堂阿姨', title: '美食向导', role: 'shop', npcId: null }]
      }
    };
    return scenes[sceneId] || { name: '未知场景', description: '', tasks: [], npcs: [] };
  }

  _renderScene(scene) {
    const qtm = window.questTriggerManager;
    const taskItems = scene.tasks.map(id => {
      const binding = window.questPoiBinder?.getBindingByQuestId(id);
      const name = binding?.questName || this._getQuestName(id, qtm) || id;
      const status = qtm?.questStatus?.[id] || qtm?.sideQuestStatus?.[id] || 'UNKNOWN';
      const statusLabel = STATUS_LABELS[status] || '未激活';
      const statusColor = STATUS_COLORS[status] || '#64748b';
      const actionable = status === QUEST_STATUS.ACTIVE || status === QUEST_STATUS.AVAILABLE || status === QUEST_STATUS.READY_TO_COMPLETE;
      return `
        <div class="hw-card scene-task-card" style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px;">
          <div style="min-width:0;">
            <div style="font-weight:600;">${this._escapeHTML(name)}</div>
            <div style="font-size:12px;color:${statusColor};margin-top:4px;">${statusLabel}</div>
          </div>
          ${actionable ? `<button class="hw-button hw-button-secondary scene-action-btn" data-task="${id}">进行任务</button>` : ''}
        </div>
      `;
    }).join('');

    const npcItems = scene.npcs.map(n => {
      const avatarUrl = imageManager.getImageUrl(n.avatar || n.npcId || n.role, n.role);
      const fallbackUrl = imageManager.getImageUrl(n.fallbackAvatar || 'default_npc_a', n.role);
      return `
      <div class="hw-card scene-npc-card" style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px;">
        <div class="scene-npc-identity">
          <img class="scene-npc-avatar" src="${this._escapeHTML(avatarUrl)}" data-fallback-src="${this._escapeHTML(fallbackUrl)}" alt="${this._escapeHTML(n.name)}" draggable="false">
          <div style="min-width:0;">
            <div style="font-weight:600;">${this._escapeHTML(n.name)}</div>
            <div style="font-size:12px;color:var(--hw-text-muted);margin-top:4px;">${this._escapeHTML(n.title || n.role)}</div>
          </div>
        </div>
        ${n.npcId ? `<button class="hw-button hw-button-secondary scene-npc-btn" data-npc="${n.npcId}">交谈</button>` : ''}
      </div>
    `;
    }).join('');

    const moduleEntries = this._getSceneModuleEntries(this.currentSceneId);

    this.overlayEl.innerHTML = `
      <div style="padding:60px 24px 24px;max-width:720px;margin:0 auto;width:100%;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;gap:12px;flex-wrap:wrap;">
          <h1 style="color:var(--hw-gold);margin:0;font-size:24px;letter-spacing:1px;">${this._escapeHTML(scene.name)}</h1>
          <button id="scene-return-btn" class="hw-button hw-button-secondary">返回校园</button>
        </div>
        <p style="color:var(--hw-text-muted);margin-bottom:24px;line-height:1.6;">${this._escapeHTML(scene.description)}</p>

        <div style="margin-bottom:24px;">
          <div style="color:var(--hw-gold);font-weight:700;margin-bottom:12px;">可触发任务</div>
          ${taskItems || '<div class="hw-card" style="color:var(--hw-text-muted);font-size:13px;">当前没有可进行的任务</div>'}
        </div>

        <div style="margin-bottom:24px;">
          <div style="color:var(--hw-gold);font-weight:700;margin-bottom:12px;">可用 NPC</div>
          ${npcItems || '<div class="hw-card" style="color:var(--hw-text-muted);font-size:13px;">场景中暂无 NPC</div>'}
        </div>

        ${moduleEntries.length ? `
          <div style="margin-bottom:24px;">
            <div style="color:var(--hw-accent-pink);font-weight:700;margin-bottom:12px;">📦 场景动作</div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">${moduleEntries.join('')}</div>
          </div>
        ` : ''}

        <button id="scene-quest-log-btn" class="hw-button hw-button-primary" style="width:100%;">打开任务日志 (J)</button>
      </div>
    `;

    this.overlayEl.querySelector('#scene-return-btn').addEventListener('click', () => this.returnToCampus());
    this.overlayEl.querySelector('#scene-quest-log-btn').addEventListener('click', () => {
      if (window.questTriggerUI) window.questTriggerUI.toggleStatusBar();
    });
    this.overlayEl.querySelectorAll('.scene-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const taskId = btn.dataset.task;
        const integration = window.questMapIntegration;
        if (integration) integration._triggerQuestById(taskId, 'main');
      });
    });
    this.overlayEl.querySelectorAll('.scene-npc-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const npcId = btn.dataset.npc;
        if (window.npcMapUI) window.npcMapUI.openNpc(npcId);
      });
    });
    this.overlayEl.querySelectorAll('.scene-npc-avatar').forEach(image => {
      image.addEventListener('error', () => {
        const fallbackSrc = image.dataset.fallbackSrc;
        if (fallbackSrc && image.dataset.fallbackTried !== 'true') {
          image.dataset.fallbackTried = 'true';
          image.src = fallbackSrc;
        }
      });
    });
    this.overlayEl.querySelectorAll('.scene-module-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'rest') this._triggerRest();
        else if (action === 'study') this._triggerStudy();
        else if (action === 'eat') this._triggerEat();
      });
    });
  }

  _getSceneModuleEntries(sceneId) {
    const entries = [];
    if (sceneId === 'dorm_inside') {
      entries.push(`<button class="hw-button hw-button-secondary scene-module-btn" data-action="rest">休息恢复体力</button>`);
    }
    if (sceneId === 'library_inside') {
      entries.push(`<button class="hw-button hw-button-secondary scene-module-btn" data-action="study">📚 自习提升知识</button>`);
    }
    if (sceneId === 'canteen_inside') {
      entries.push(`<button class="hw-button hw-button-secondary scene-module-btn" data-action="eat">用餐恢复体能</button>`);
    }
    return entries;
  }

  _triggerRest() {
    const qtm = window.questTriggerManager;
    if (!qtm) return;
    qtm.applyStatChanges({ stamina: 30, mood: 5 }, 'rest');
    qtm.saveProgress?.();
    this._showToast('休息后体能+30 心情+5', 'success');
  }

  _triggerStudy() {
    const qtm = window.questTriggerManager;
    if (!qtm) return;
    const subject = this._pickStudySubject(qtm);
    qtm.addProficiency?.(subject, 10, 'study');
    qtm.applyStatChanges({ knowledge: 8, stamina: -5, mood: 2 }, 'study');
    qtm.saveProgress?.();
    this._showToast(`自习后 ${subject} 熟练度+10 知识+8`, 'success');
  }

  _triggerEat() {
    const qtm = window.questTriggerManager;
    if (!qtm) return;
    qtm.applyStatChanges({ stamina: 20, mood: 8, money: -8 }, 'eat');
    qtm.saveProgress?.();
    this._showToast('用餐后体能+20 心情+8 金币-8', 'success');
  }

  _pickStudySubject(qm) {
    const unlocked = Array.from(qm.unlockedSubjects || []);
    if (unlocked.length) return unlocked[0];
    const subjects = Object.keys(qm.proficiencies || {});
    if (subjects.length) return subjects[0];
    return '专业必修课1';
  }

  _getQuestName(questId, qtm) {
    const detail = qtm?.getQuestDetail?.(questId) || qtm?.getSideQuestDetail?.(questId);
    return detail?.title || detail?.name || questId;
  }

  _showToast(message, type = 'info') {
    if (typeof window !== 'undefined' && window.UIFeedback) {
      window.UIFeedback.showToast(message, type);
      return;
    }
    const color = type === 'success' ? '#00C9A7' : type === 'error' ? '#F87171' : '#F5C542';
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 90px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15,23,42,0.96);
      color: ${color};
      border: 1px solid ${color};
      border-radius: 8px;
      padding: 10px 18px;
      z-index: 11000;
      font-weight: 600;
      box-shadow: 0 18px 50px rgba(0,0,0,0.48);
      max-width: min(480px, 92vw);
      font-size: 13px;
      pointer-events: none;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  _autoInit() {
    const tryInit = () => {
      if (window._mapSystemReady) {
        if (this.initialized) return;
        this.init();
      }
    };
    if (typeof window !== 'undefined') {
      if (window._mapSystemReady) tryInit();
      window.addEventListener('mapsystem:ready', tryInit);
      setTimeout(tryInit, 600);
      setTimeout(tryInit, 1600);
    }
  }

  _escapeHTML(value) {
    return String(value ?? '').replace(/[\u0026\u003c\u003e"']/g, ch => ({
      '\u0026': '\u0026amp;',
      '\u003c': '\u0026lt;',
      '\u003e': '\u0026gt;',
      '"': '\u0026quot;',
      "'": '\u0026#39;'
    }[ch]));
  }
}

export const mapSceneManager = new MapSceneManager();
if (typeof window !== 'undefined') mapSceneManager._autoInit();
export default mapSceneManager;
