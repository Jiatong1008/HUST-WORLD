/**
 * NPC交互模块
 *
 * 功能：
 *   - 自动加载NPC数据
 *   - 靠近NPC自动播报对话（无选项NPC）
 *   - 手动交互对话（有选项NPC，按E键）
 *   - 支持社团加入等交互动作
 */

const NPC_TYPES = {
  teacher: { icon: '👨‍🏫', color: '#9C27B0', label: '老师' },
  senior: { icon: '👨‍🎓', color: '#3F51B5', label: '学长' },
  canteen_worker: { icon: '👩‍🍳', color: '#E91E63', label: '食堂员工' },
  dormitory_guard: { icon: '👮', color: '#FF9800', label: '保安' },
  other: { icon: '👤', color: '#607D8B', label: '其他' },
};

// 使用全局图片管理器（如果存在）
let imageManager = null;

// 获取图片管理器（延迟获取，确保已初始化）
function getImageManager() {
  if (!imageManager && window.imageManager) {
    imageManager = window.imageManager;
    console.log('[NPC] 图片管理器已获取');
  }
  return imageManager;
}

class NpcModule {
  constructor(apiBase) {
    this.apiBase = apiBase;
    this.npcs = [];
    this.nearestNpc = null;
    this.currentDialog = null;
    this.currentDialogStep = 0;
    this.interactionRange = 80;
    this.autoInteractionRange = 42;
    this.autoInteractCooldown = 3000;
    this.lastAutoInteract = 0;
    this.autoInteracting = false;

    this.overlayEl = null;
    this.dialogTextEl = null;
    this.choicesEl = null;
    this.npcNameEl = null;
    this.hintEl = null;
    this.autoDialogEl = null;
    this.autoDialogNameEl = null;
    this.autoDialogTextEl = null;
  }

  init() {
    this._createDOM();
    this._bindEvents();
    this._loadData();
  }

  _createDOM() {
    this.hintEl = document.createElement('div');
    this.hintEl.id = 'npcHint';
    this.hintEl.innerHTML = '<span>按 E 对话</span>';
    this.hintEl.style.cssText = `
      display: none;
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(76, 175, 80, 0.9);
      color: #fff;
      padding: 10px 20px;
      border-radius: 20px;
      font-size: 14px;
      z-index: 500;
    `;
    document.body.appendChild(this.hintEl);

    this.autoDialogEl = document.createElement('div');
    this.autoDialogEl.id = 'autoDialog';
    this.autoDialogEl.style.cssText = `
      display: none;
      position: fixed;
      bottom: 150px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(42, 42, 74, 0.95);
      border: 2px solid #ffd700;
      border-radius: 12px;
      padding: 15px 25px;
      max-width: 400px;
      width: 90%;
      z-index: 600;
      box-shadow: 0 0 20px rgba(255,215,0,0.2);
    `;
    const autoDialogContent = document.createElement('div');
    autoDialogContent.innerHTML = `
      <div id="autoDialogName" style="
        color: #ffd700;
        font-size: 14px;
        font-weight: bold;
        margin-bottom: 8px;
      "></div>
      <div id="autoDialogText" style="
        color: #fff;
        font-size: 14px;
        line-height: 1.5;
      "></div>
    `;
    this.autoDialogEl.appendChild(autoDialogContent);
    document.body.appendChild(this.autoDialogEl);

    this.autoDialogNameEl = document.getElementById('autoDialogName');
    this.autoDialogTextEl = document.getElementById('autoDialogText');

    this.overlayEl = document.createElement('div');
    this.overlayEl.id = 'dialogOverlay';
    this.overlayEl.innerHTML = `
      <div id="dialogBox" style="
        background: #2a2a4a;
        border: 3px solid #ffd700;
        border-radius: 12px;
        padding: 20px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 0 30px rgba(255,215,0,0.3);
      ">
        <div id="dialogNpcName" style="
          color: #ffd700;
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 10px;
          border-bottom: 1px solid #555;
          padding-bottom: 8px;
        ">NPC</div>
        <div id="dialogText" style="
          color: #fff;
          font-size: 15px;
          line-height: 1.6;
          margin-bottom: 15px;
          min-height: 60px;
        "></div>
        <div id="dialogChoices" style="
          display: flex;
          flex-direction: column;
          gap: 8px;
        "></div>
        <div id="dialogHint" style="
          font-size: 11px;
          color: #888;
          text-align: center;
          margin-top: 15px;
          padding-top: 10px;
          border-top: 1px solid #444;
        ">空格键继续 | ESC退出</div>
      </div>
    `;
    this.overlayEl.style.cssText = `
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.7);
      z-index: 1000;
      justify-content: center;
      align-items: center;
    `;
    document.body.appendChild(this.overlayEl);

    this.npcNameEl = document.getElementById('dialogNpcName');
    this.dialogTextEl = document.getElementById('dialogText');
    this.choicesEl = document.getElementById('dialogChoices');
  }

  _bindEvents() {
    document.addEventListener('keydown', (e) => {
      const key = e.key || '';
      if (key.toLowerCase() === 'e' && this.nearestNpc && !this.currentDialog && !this.autoInteracting) {
        this._showManualDialog(this.nearestNpc);
      }
      if (e.key === 'Escape' && this.currentDialog) {
        this._closeDialog();
      }
      if (e.key === ' ' && this.currentDialog) {
        e.preventDefault();
        this._advanceDialog();
      }
      if (e.key === ' ' && this.autoInteracting) {
        e.preventDefault();
        this._closeAutoDialog();
      }
    });
  }

  async _loadData() {
    try {
      console.log('[NPC] 开始加载数据...');
      const [mapsData, npcsData] = await Promise.all([
        this._fetchAPI('/api/maps'),
        this._fetchAPI('/api/npcs')
      ]);

      console.log('[NPC] 获取到地图数据:', mapsData?.length);
      console.log('[NPC] 获取到NPC数据:', npcsData?.length);

      this.npcs = npcsData.map(npc => {
        const mapInfo = mapsData.find(m => m.map_id === npc.map_id);
        return {
          id: npc.npc_id,
          name: npc.npc_name,
          type: npc.npc_type || 'other',
          x: npc.x_coordinate,
          y: npc.y_coordinate,
          map_id: npc.map_id,
          dialogue: typeof npc.dialogue === 'string' ? JSON.parse(npc.dialogue) : (npc.dialogue || {}),
          map_name: mapInfo ? mapInfo.map_name : ''
        };
      });

      console.log(`[NPC] 加载了 ${this.npcs.length} 个NPC:`, this.npcs.map(n => n.name));
    } catch (error) {
      console.error('[NPC] 数据加载失败:', error);
    }
  }

  async _fetchAPI(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    return body && body.success === true && body.data !== undefined ? body.data : body;
  }

  checkNearby(x, y) {
    const nearest = this._getNearbyNpc(x, y, this.interactionRange);
    const autoNearest = this._getNearbyNpc(x, y, this.autoInteractionRange);

    if (!nearest) {
      this._handleOutOfRange();
      this.nearestNpc = null;
      return null;
    }

    if (this.currentDialog && this.currentDialog.id !== nearest.id) {
      this._handleOutOfRange();
    }

    this.nearestNpc = nearest;

    if (this.nearestNpc && !this.currentDialog && !this.autoInteracting) {
      const now = Date.now();
      const hasOptions = this._hasDialogOptions(this.nearestNpc);
      
      if (hasOptions) {
        this.hintEl.style.display = 'block';
      } else {
        this.hintEl.style.display = 'none';
        
        if (autoNearest?.id === this.nearestNpc.id && now - this.lastAutoInteract > this.autoInteractCooldown) {
          this._triggerAutoDialog(this.nearestNpc);
        }
      }
    } else {
      this.hintEl.style.display = 'none';
    }

    return this.nearestNpc;
  }

  _handleOutOfRange() {
    this.hintEl.style.display = 'none';
    if (this.autoInteracting) this._closeAutoDialog();
    if (this.currentDialog) this._closeDialog();
  }

  _hasDialogOptions(npc) {
    if (!npc.dialogue || !npc.dialogue.dialogues) return false;
    return npc.dialogue.dialogues.some(d => d.options);
  }

  async _triggerAutoDialog(npc) {
    if (!npc.dialogue || !npc.dialogue.dialogues || npc.dialogue.dialogues.length === 0) return;
    
    this.autoInteracting = true;
    this.lastAutoInteract = Date.now();
    
    this.autoDialogNameEl.textContent = npc.name;
    this.autoDialogTextEl.textContent = npc.dialogue.dialogues[0].text;
    this.autoDialogEl.style.display = 'block';
    
    setTimeout(() => {
      this._closeAutoDialog();
    }, 3000);
  }

  _closeAutoDialog() {
    this.autoDialogEl.style.display = 'none';
    this.autoInteracting = false;
  }

  _getNearbyNpc(x, y, range = this.interactionRange) {
    let nearest = null;
    let minDist = range;

    for (const npc of this.npcs) {
      const dist = Math.sqrt((npc.x - x) ** 2 + (npc.y - y) ** 2);
      if (dist < minDist) {
        minDist = dist;
        nearest = npc;
      }
    }

    return nearest;
  }

  renderNPCs(ctx, coordSys, characterPos) {
    const scale = coordSys.getScale();
    const imgMgr = getImageManager();

    this.npcs.forEach(npc => {
      const p = coordSys.worldToScreen(npc.x, npc.y);
      const cfg = NPC_TYPES[npc.type] || NPC_TYPES.other;
      const isNearest = this.nearestNpc && this.nearestNpc.id === npc.id;
      const r = isNearest ? 23 : 22; // NPC基础大小，与玩家更接近

      // 尝试使用图片绘制NPC
      let hasImage = false;
      if (imgMgr && typeof imgMgr.isReady === 'function' && imgMgr.isReady()) {
        const npcImage = imgMgr.getNpcImage(npc.name, npc.type);
        if (npcImage) {
          // 绘制NPC图片，保持原始宽高比，与玩家比例协调
          const imgRatio = npcImage.naturalWidth / npcImage.naturalHeight;
          const imgHeight = r * 2.2; // 与玩家相同的高度倍数
          const imgWidth = imgHeight * imgRatio;
          
          ctx.drawImage(
            npcImage,
            p.x - imgWidth / 2,
            p.y - imgHeight / 2,
            imgWidth,
            imgHeight
          );
          hasImage = true;
        }
      }

      // 如果没有图片，回退到原来的绘制方式
      if (!hasImage) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = cfg.color;
        ctx.fill();
        ctx.strokeStyle = isNearest ? '#ffd700' : cfg.color;
        ctx.lineWidth = isNearest ? 4 : 2;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(cfg.icon, p.x, p.y + 5);
      }

      if (scale > 0.5) {
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(npc.name, p.x, p.y + r * 1.8 + 18);
      }
    });
  }

  _showManualDialog(npc) {
    this.currentDialog = npc;
    this.currentDialogStep = 0;

    this.npcNameEl.textContent = npc.name;
    this._updateDialogText();

    this.overlayEl.style.display = 'flex';
    this.hintEl.style.display = 'none';
  }

  _closeDialog() {
    this.overlayEl.style.display = 'none';
    this.currentDialog = null;
    this.currentDialogStep = 0;
  }

  _advanceDialog() {
    if (!this.currentDialog) return;

    const d = this.currentDialog.dialogue;
    if (!d || !d.dialogues) {
      this._closeDialog();
      return;
    }

    this.currentDialogStep++;
    this._updateDialogText();
  }

  _updateDialogText() {
    if (!this.currentDialog) return;

    const d = this.currentDialog.dialogue;
    if (!d) {
      this.dialogTextEl.textContent = '暂无对话内容';
      this.choicesEl.innerHTML = '';
      return;
    }

    if (d.dialogues && d.dialogues.length > 0) {
      this._renderSequentialDialog(d);
    } else if (d.greeting) {
      this._renderTopicDialog(d);
    } else {
      this.dialogTextEl.textContent = '暂无对话内容';
      this.choicesEl.innerHTML = '';
    }
  }

  _renderSequentialDialog(d) {
    const dialogues = d.dialogues;
    let step = this.currentDialogStep;

    if (step >= dialogues.length) {
      this._closeDialog();
      return;
    }

    const current = dialogues[step];

    if (current.options) {
      this.dialogTextEl.textContent = '';
      this._renderDialogOptions(current.options);
    } else if (current.text) {
      this.dialogTextEl.textContent = current.text;
      this.choicesEl.innerHTML = '';

      if (current.action) {
        setTimeout(() => {
          this._handleDialogAction(current);
          this._closeDialog();
        }, 1000);
      }
    } else if (current.action) {
      this._handleDialogAction(current);
      this._closeDialog();
    }
  }

  _renderTopicDialog(d) {
    this.dialogTextEl.textContent = d.greeting || '你好！';
    this.choicesEl.innerHTML = '';
  }

  _optionLabel(option) {
    return typeof option === 'string' ? option : (option.text || option.label || '继续');
  }

  _renderDialogOptions(options) {
    this.choicesEl.innerHTML = options.map((opt, i) =>
      `<button class="dialog-choice" data-index="${i}" style="
        padding: 10px 15px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
        text-align: left;
      ">${this._optionLabel(opt)}</button>`
    ).join('');

    this.choicesEl.querySelectorAll('.dialog-choice').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this._handleOptionSelect(index);
      });
    });
  }

  _handleOptionSelect(index) {
    const d = this.currentDialog.dialogue;
    const current = d.dialogues[this.currentDialogStep];
    
    if (current.options && index < current.options.length) {
      const selectedOption = current.options[index];
      const selectedLabel = this._optionLabel(selectedOption);
      console.log(`[NPC] 选择了选项: ${selectedLabel}`);
      
      if (selectedOption === '离开' || selectedOption?.action === 'close') {
        this._closeDialog();
        return;
      }

      if (typeof selectedOption === 'object' && selectedOption.action) {
        this._handleDialogAction(selectedOption);
        this._closeDialog();
        return;
      }
      
      this.currentDialogStep++;
      this._updateDialogText();
    }
  }

  _handleDialogAction(dialogueItem) {
    if (dialogueItem.action === 'join_club' && dialogueItem.clubId) {
      console.log(`[NPC] 触发加入社团动作: clubId=${dialogueItem.clubId}`);
      if (window.clubSystem) {
        window.clubSystem.handleJoin(dialogueItem.clubId);
      }
    } else if (dialogueItem.action === 'issue_club_tasks' && dialogueItem.clubId) {
      console.log(`[NPC] 打开社团任务发布: clubId=${dialogueItem.clubId}`);
      if (window.clubSystem) {
        window.clubSystem.openTaskPublisher(dialogueItem.clubId, this.currentDialog?.name || '任务发布员');
      }
    }
  }

  getNPCs() {
    return this.npcs;
  }

  getNearestNpc() {
    return this.nearestNpc;
  }
}

export default NpcModule;
