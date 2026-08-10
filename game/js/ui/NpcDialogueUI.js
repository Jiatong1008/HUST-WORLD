import { getNpcById } from '../config/NpcConfig.js';
import { getDialogueById, getDialogueByNpcId, DIALOGUE_NPC_MAP } from '../config/DialogueConfig.js';
import { getShopById, getShopItems, getItemById } from '../config/ItemConfig.js';
import { imageManager } from '../../../map/js/ImageManager.js';

export class NpcDialogueUI {
  constructor(options = {}) {
    this.saveManager = options.saveManager || null;
    this.questManager = options.questManager || null;
    this.onClose = options.onClose || (() => {});
    this.onQuestUpdate = options.onQuestUpdate || (() => {});
    this.onError = options.onError || ((message) => console.error('[NpcDialogueUI]', message));
    this.npc = null;
    this.dialogue = null;
    this.currentNodeId = 'start';
    this.isOpen = false;
    this.shopOpen = false;
    this._ensureProductStyles();
    this._ensureStyles();
    this._buildDom();
    this._bindKeyboard();
  }

  _ensureProductStyles() {
    if (document.getElementById('gameplay-panels-styles')) return;
    const link = document.createElement('link');
    link.id = 'gameplay-panels-styles';
    link.rel = 'stylesheet';
    link.href = '/game/css/gameplay-panels.css';
    document.head.appendChild(link);
  }

  _ensureStyles() {
    if (document.getElementById('npc-dialogue-styles')) return;
    const style = document.createElement('style');
    style.id = 'npc-dialogue-styles';
    style.textContent = `
      .npc-dialogue-overlay { position: fixed; inset: 0; z-index: 9000; display: none; align-items: center; justify-content: center; background: rgba(8,11,20,.72); padding: 16px; backdrop-filter: blur(6px); }
      .npc-dialogue-panel { width: min(640px, 100%); max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; background: linear-gradient(160deg, rgba(30,41,59,.96) 0%, rgba(24,34,49,.98) 100%), radial-gradient(circle at 20% 20%, rgba(30,111,223,.06), transparent 40%), radial-gradient(circle at 80% 80%, rgba(245,197,66,.04), transparent 40%); border: 1px solid rgba(148,163,184,.12); border-radius: 12px; box-shadow: 0 18px 50px rgba(0,0,0,.48); font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif; }
      .npc-dialogue-panel::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, #F5C542, #1E6FDF, transparent); opacity: .7; }
      .npc-dialogue-header { position: relative; display: flex; align-items: center; gap: 12px; padding: 14px 16px; color: #fff; background: linear-gradient(90deg, #005BAC, #1E6FDF); }
      .npc-dialogue-avatar { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; background: rgba(255,255,255,.12); border: 2px solid rgba(255,255,255,.6); }
      .npc-dialogue-name { font-weight: 700; font-size: 16px; }
      .npc-dialogue-title { font-size: 12px; opacity: .9; }
      .npc-dialogue-meta { font-size: 11px; opacity: .72; margin-top: 2px; }
      .npc-dialogue-close { margin-left: auto; border: 0; border-radius: 999px; width: 32px; height: 32px; color: #fff; background: rgba(255,255,255,.18); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; }
      .npc-dialogue-close:hover { background: rgba(255,255,255,.28); }
      .npc-dialogue-body { padding: 18px; overflow-y: auto; background: rgba(8,11,20,.4); color: #e5e7eb; }
      .npc-dialogue-speaker { font-weight: 700; color: #F5C542; margin-bottom: 6px; font-size: 15px; }
      .npc-dialogue-text { color: #e5e7eb; line-height: 1.7; margin-bottom: 16px; white-space: pre-wrap; font-size: 14px; }
      .npc-dialogue-options { display: flex; flex-direction: column; gap: 10px; }
      .npc-dialogue-option { text-align: left; }
      .npc-dialogue-footer { padding: 10px 16px; border-top: 1px solid rgba(148,163,184,.12); color: #94a3b8; font-size: 12px; background: rgba(15,23,42,.6); }
      .npc-dialogue-shop-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
      .npc-dialogue-shop-item { display: flex; flex-direction: column; gap: 6px; background: rgba(255,255,255,.03); border: 1px solid rgba(148,163,184,.12); border-radius: 8px; padding: 12px; cursor: pointer; text-align: left; color: #e5e7eb; transition: border-color .15s ease-out, background .15s ease-out; }
      .npc-dialogue-shop-item:hover { border-color: rgba(245,197,66,.35); background: rgba(255,255,255,.05); }
      .npc-dialogue-shop-item strong { color: #F5C542; font-size: 14px; }
      .npc-dialogue-shop-item small { color: #94a3b8; font-size: 12px; }
      .npc-dialogue-shop-item .price { color: #F5C542; font-weight: 700; font-size: 13px; }
      .npc-dialogue-effects { margin: 10px 0 14px; padding: 10px 12px; border-radius: 8px; background: rgba(0,201,167,.1); border: 1px solid rgba(0,201,167,.2); color: #00C9A7; font-size: 12px; line-height: 1.6; }
      .npc-dialogue-summary { margin-top: 12px; color: #94a3b8; font-size: 12px; line-height: 1.6; }
      .npc-dialogue-toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 10001; background: rgba(15,23,42,.96); color: #F5C542; border: 1px solid rgba(245,197,66,.45); border-radius: 8px; padding: 10px 18px; opacity: 0; pointer-events: none; transition: opacity .2s; font-weight: 600; box-shadow: 0 18px 50px rgba(0,0,0,.48); }
      .npc-dialogue-toast.show { opacity: 1; }
    `;
    document.head.appendChild(style);
  }

  _buildDom() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'npc-dialogue-overlay';
    this.overlay.innerHTML = `
      <div class="npc-dialogue-panel">
        <div class="npc-dialogue-header">
          <img class="npc-dialogue-avatar" alt="NPC avatar">
          <div><div class="npc-dialogue-name"></div><div class="npc-dialogue-title"></div><div class="npc-dialogue-meta"></div></div>
          <button class="npc-dialogue-close" aria-label="Close">x</button>
        </div>
        <div class="npc-dialogue-body"></div>
        <div class="npc-dialogue-footer">E / Enter 继续 · 数字键选择 · Esc 关闭</div>
      </div>
    `;
    document.body.appendChild(this.overlay);
    this.avatarEl = this.overlay.querySelector('.npc-dialogue-avatar');
    this.nameEl = this.overlay.querySelector('.npc-dialogue-name');
    this.titleEl = this.overlay.querySelector('.npc-dialogue-title');
    this.metaEl = this.overlay.querySelector('.npc-dialogue-meta');
    this.bodyEl = this.overlay.querySelector('.npc-dialogue-body');
    this.overlay.querySelector('.npc-dialogue-close').addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', event => {
      if (event.target === this.overlay) this.close();
    });
    this.toast = document.createElement('div');
    this.toast.className = 'npc-dialogue-toast';
    document.body.appendChild(this.toast);
  }

  _bindKeyboard() {
    this._keydownHandler = event => {
      if (!this.isOpen || this.shopOpen) return;
      if (event.key === 'Escape') {
        this.close();
        return;
      }
      const current = this._getCurrentNode();
      if (!current) return;
      const options = (current.options || []).filter(option => this._checkConditions(option.conditions));
      if (event.key === 'Enter' || event.key === 'e' || event.key === 'E') {
        if (options.length === 1) this._chooseOption(options[0]);
        else if (options.length === 0) this._advanceOrClose(current);
      }
      if (/^[1-9]$/.test(event.key)) {
        const option = options[Number(event.key) - 1];
        if (option) this._chooseOption(option);
      }
    };
    document.addEventListener('keydown', this._keydownHandler);
  }

  destroy() {
    document.removeEventListener('keydown', this._keydownHandler);
    this.overlay?.remove();
    this.toast?.remove();
  }

  open(npcId) {
    const npc = getNpcById(npcId);
    if (!npc) {
      this.onError(`NPC ${npcId} is not configured`);
      return false;
    }
    const dialogue = getDialogueByNpcId(npcId);
    if (!dialogue) {
      this.onError(`NPC ${npcId} has no dialogue`);
      return false;
    }
    return this._openDialogue(npc, dialogue);
  }

  openByDialogueId(dialogueId) {
    const dialogue = getDialogueById(dialogueId);
    if (!dialogue) {
      this.onError(`Dialogue ${dialogueId} is not configured`);
      return false;
    }
    return this._openDialogue(getNpcById(dialogue.npcId), dialogue);
  }

  _openDialogue(npc, dialogue) {
    this.npc = npc;
    this.dialogue = dialogue;
    this.currentNodeId = this._resolveStartNodeId(dialogue);
    this.isOpen = true;
    this.shopOpen = false;
    this._recordHistory();
    this._renderHeader();
    this._renderNode();
    this.overlay.style.display = 'flex';
    return true;
  }

  _resolveStartNodeId(dialogue) {
    const nodes = dialogue?.nodes || [];
    if (!this.npc || !nodes.length) return 'start';
    const npcId = this.npc.npcId;
    const relatedQuestId = this._getQuestIdByNpcId(npcId);
    if (!relatedQuestId) return 'start';
    const status = this._getQuestStatus(relatedQuestId);
    const priorityMap = {
      ACTIVE: ['active', 'progress', 'ongoing'],
      READY_TO_COMPLETE: ['ready', 'deliver', 'complete'],
      COMPLETED: ['completed', 'done', 'finished'],
      AVAILABLE: ['accept', 'available'],
      LOCKED: ['locked', 'unavailable']
    };
    const keywords = priorityMap[status] || [];
    for (const keyword of keywords) {
      const match = nodes.find(node => node.id !== 'start' && node.id.includes(keyword));
      if (match) return match.id;
    }
    return 'start';
  }

  _getQuestIdByNpcId(npcId) {
    for (const [questId, mappedNpcId] of Object.entries(DIALOGUE_NPC_MAP)) {
      if (mappedNpcId === npcId) return questId;
    }
    return null;
  }

  close() {
    this.isOpen = false;
    this.shopOpen = false;
    this.overlay.style.display = 'none';
    this.onClose();
  }

  _renderHeader() {
    this.nameEl.textContent = this.npc?.name || '系统';
    this.titleEl.textContent = this.npc?.title || '';
    this.metaEl.textContent = [this.npc?.defaultLocation, this._formatRole(this.npc?.role)].filter(Boolean).join(' · ');
    const fallback = this.npc?.fallbackAvatar || 'default_npc_a';
    const getUrl = typeof imageManager?.getImageUrl === 'function'
      ? imageManager.getImageUrl.bind(imageManager)
      : () => '';
    this.avatarEl.src = getUrl(this.npc?.avatar, this.npc?.role) || getUrl(fallback) || '';
    this.avatarEl.onerror = () => {
      this.avatarEl.src = getUrl(fallback) || '';
    };
  }

  _formatRole(role) {
    const roleMap = {
      teacher: '教师',
      student: '学生',
      club: '社团',
      shop: '商店',
      mentor: '导师',
      admin: '管理',
      coach: '教练',
      librarian: '图书馆'
    };
    return roleMap[role] || role || '';
  }

  _getCurrentNode() {
    const nodes = this.dialogue?.nodes || [];
    return nodes.find(node => node.id === this.currentNodeId) || nodes[0] || null;
  }

  _renderNode() {
    const current = this._getCurrentNode();
    if (!current) {
      this.close();
      return;
    }
    this.shopOpen = false;
    const nodes = this.dialogue?.nodes || [];
    const nodeIndex = Math.max(0, nodes.findIndex(node => node.id === current.id));
    this.bodyEl.innerHTML = `
      <div class="npc-dialogue-progress">对话进度 <strong>${nodeIndex + 1}</strong> / ${Math.max(1, nodes.length)}</div>
      <div class="npc-dialogue-speaker">${current.speaker || this.npc?.name || 'System'}</div>
      <div class="npc-dialogue-text">${current.text || ''}</div>
      ${current.effectsPreview ? `<div class="npc-dialogue-effects">${this._formatEffects(current.effectsPreview).split(' · ').filter(Boolean).map(text => `<span class="hw-tag">${text}</span>`).join('')}</div>` : ''}
      <div class="npc-dialogue-options"></div>
    `;
    const optionsEl = this.bodyEl.querySelector('.npc-dialogue-options');
    const options = current.options || [];
    if (options.length === 0) {
      const button = this._createButton(current.isEnd ? '结束对话' : '继续', true, 1);
      button.addEventListener('click', () => this._advanceOrClose(current));
      optionsEl.appendChild(button);
      return;
    }
    options.forEach((option, index) => {
      const available = this._checkConditions(option.conditions);
      const button = this._createButton(option.text, available, index + 1, this._getConditionHint(option.conditions));
      if (available) button.addEventListener('click', () => this._chooseOption(option));
      optionsEl.appendChild(button);
    });
  }

  _createButton(text, enabled, index = null, reason = '') {
    const button = document.createElement('button');
    button.className = 'npc-dialogue-option hw-button hw-button-secondary';
    const indexEl = document.createElement('span');
    indexEl.className = 'npc-dialogue-option-index';
    indexEl.textContent = index || 'E';
    const copy = document.createElement('span');
    copy.textContent = text;
    if (!enabled && reason) {
      const hint = document.createElement('span');
      hint.className = 'npc-dialogue-option-reason';
      hint.textContent = reason;
      copy.appendChild(hint);
    }
    button.append(indexEl, copy);
    button.disabled = !enabled;
    return button;
  }

  _getConditionHint(conditions) {
    if (!conditions) return '';
    const hints = [];
    if (conditions.statMin) {
      for (const [key, value] of Object.entries(conditions.statMin)) {
        hints.push(`需要${this._statLabel(key)}达到 ${value}`);
      }
    }
    if (conditions.moneyMin !== undefined) hints.push(`需要 ${conditions.moneyMin} 金币`);
    if (conditions.hasItem) hints.push(`需要物品：${this._getItemName(conditions.hasItem)}`);
    if (conditions.questCompleted) hints.push('需要完成前置任务');
    if (conditions.relationMin) hints.push('需要更高的 NPC 好感度');
    return hints.join('，') || '当前条件尚未满足';
  }

  _checkConditions(conditions) {
    if (!conditions || !this.saveManager) return true;
    const progress = this.saveManager.getProgress?.() || {};
    const stats = this.saveManager.getStats?.() || {};
    if (conditions.statMin) {
      for (const [key, value] of Object.entries(conditions.statMin)) {
        if ((stats[key] || 0) < value) return false;
      }
    }
    if (conditions.moneyMin !== undefined && (progress.money || 0) < conditions.moneyMin) return false;
    if (conditions.questCompleted && !this._isQuestCompleted(conditions.questCompleted)) return false;
    if (conditions.questNotCompleted && this._isQuestCompleted(conditions.questNotCompleted)) return false;
    if (conditions.questStatus) {
      for (const [npcIdOrQuestId, status] of Object.entries(conditions.questStatus)) {
        const actual = this._getQuestStatus(npcIdOrQuestId);
        if (actual !== status) return false;
      }
    }
    if (conditions.hasItem) {
      const items = progress.items || {};
      if (!items[conditions.hasItem] || items[conditions.hasItem] <= 0) return false;
    }
    if (conditions.relationMin) {
      const relations = progress.npcRelations || {};
      for (const [npcId, value] of Object.entries(conditions.relationMin)) {
        if ((relations[npcId] || 0) < value) return false;
      }
    }
    return true;
  }

  _getQuestStatus(questId) {
    const side = this.questManager?.sideQuestStatus || {};
    const main = this.questManager?.questStatus || {};
    if (side[questId] !== undefined) return side[questId];
    if (main[questId] !== undefined) return main[questId];
    if (this._isQuestCompleted(questId)) return 'COMPLETED';
    return 'LOCKED';
  }

  _isQuestCompleted(questId) {
    const completed = this.questManager?.completedQuests || new Set();
    const sideStatus = this.questManager?.sideQuestStatus || {};
    return completed.has?.(questId) || completed.includes?.(questId) || sideStatus[questId] === 'COMPLETED';
  }

  _chooseOption(option) {
    if (option.effects) this._applyEffects(option.effects);
    this._applyAffinityChange(option);
    if (option.next) {
      this.currentNodeId = option.next;
      this._renderNode();
    } else {
      this.close();
    }
  }

  /**
   * 应用对话选项中的 affinityChange 关系值变化。
   * 若选项存在非零 affinityChange，则调用 QuestTriggerManager 调整关系并显示 Toast。
   */
  _applyAffinityChange(option) {
    if (!option || typeof option.affinityChange !== 'number' || option.affinityChange === 0) return;
    const qm = this._getQuestManager();
    const npcId = this.npc?.npcId;
    if (!npcId) return;
    if (qm && typeof qm.adjustNpcRelation === 'function') {
      qm.adjustNpcRelation(npcId, option.affinityChange, 'dialogue');
    } else {
      this._addRelation({ [npcId]: option.affinityChange });
    }
    const sign = option.affinityChange > 0 ? '+' : '';
    this._showToast(`与 ${this.npc.name || npcId} 的关系 ${sign}${option.affinityChange}`);
  }

  _advanceOrClose(current) {
    if (!current || current.isEnd) {
      this.close();
      return;
    }
    const next = current.options?.find(option => option.next)?.next;
    if (next) {
      this.currentNodeId = next;
      this._renderNode();
    } else {
      this.close();
    }
  }

  _getQuestManager() {
    return this.questManager || (typeof window !== 'undefined' ? window.questTriggerManager : null) || null;
  }

  _getCurrentStat(key) {
    const qm = this._getQuestManager();
    if (qm && typeof qm.characterStats === 'object' && typeof qm.characterStats[key] === 'number') {
      return qm.characterStats[key];
    }
    if (!this.saveManager) return 0;
    const stats = this.saveManager.getStats?.() || {};
    if (typeof stats[key] === 'number') return stats[key];
    const progress = this.saveManager.getProgress?.() || {};
    return typeof progress[key] === 'number' ? progress[key] : 0;
  }

  _applyEffects(effects) {
    if (!effects) return;
    const qm = this._getQuestManager();
    let growthResult = null;
    if (qm && typeof qm.applyStatChanges === 'function') {
      const statChanges = {};
      if (effects.stats) {
        for (const [key, delta] of Object.entries(effects.stats)) {
          if (typeof delta === 'number') statChanges[key] = delta;
        }
      }
      if (typeof effects.money === 'number') statChanges.money = effects.money;
      if (typeof effects.experience === 'number') statChanges.experience = effects.experience;
      if (Object.keys(statChanges).length > 0) {
        growthResult = qm.applyStatChanges(statChanges, 'dialogue');
      }
    } else if (this.saveManager) {
      const progress = this.saveManager.getProgress?.() || {};
      const stats = this.saveManager.getStats?.() || {};
      if (effects.stats) {
        for (const [key, delta] of Object.entries(effects.stats)) {
          this.saveManager.setProgressField(key, (stats[key] || 0) + delta);
        }
      }
      if (typeof effects.money === 'number') this.saveManager.setProgressField('money', (progress.money || 0) + effects.money);
      if (typeof effects.experience === 'number') this.saveManager.setProgressField('experience', (progress.experience || 0) + effects.experience);
    }
    if (effects.relation) this._addRelation(effects.relation);
    if (effects.addItem) this._addItem(effects.addItem);
    if (effects.startQuest) this._startQuest(effects.startQuest);
    if (effects.acceptQuest) this._acceptQuest(effects.acceptQuest);
    if (effects.progressQuest) this._progressQuest(effects.progressQuest);
    if (effects.deliverQuest) this._completeQuest(effects.deliverQuest);
    if (effects.completeQuest) this._completeQuest(effects.completeQuest);
    if (effects.unlockQuest) this._unlockQuest(effects.unlockQuest);
    if (effects.startObjective) this._startObjective(effects.startObjective);
    if (effects.removeItem) this._removeItem(effects.removeItem);
    if (effects.removeItems) this._removeItems(effects.removeItems);
    if (effects.shopOpen) this._openShop(effects.shopOpen);
    if (effects.clubAction === 'join') this.saveManager?.setProgressField('clubJoined', true);
    if (this.saveManager?.save) this.saveManager.save();
    const message = this._formatEffects(effects) || 'Progress updated';
    this._showToast(message);
    if (growthResult?.levelUps?.length > 0) {
      setTimeout(() => this._showToast('Level Up! ' + growthResult.messages.join(' ')), 600);
    }
  }

  _addRelation(relationMap) {
    const relations = { ...(this.saveManager.getProgressField?.('npcRelations') || {}) };
    for (const [npcId, delta] of Object.entries(relationMap)) {
      relations[npcId] = (relations[npcId] || 0) + delta;
    }
    this.saveManager.setProgressField('npcRelations', relations);
  }

  _addItem(itemId) {
    const items = { ...(this.saveManager.getProgressField?.('items') || {}) };
    items[itemId] = (items[itemId] || 0) + 1;
    this.saveManager.setProgressField('items', items);
    this._showToast(`获得物品：${itemId}`);
  }

  _startQuest(questId) {
    try {
      const result = this.questManager?.tryActivateQuest?.(questId) || this.questManager?.tryActivateSideQuest?.(questId);
      this._showToast(result?.message || `已接受任务：${questId}`);
    } catch (error) {
      this.onError(`Start quest failed: ${error.message}`);
    }
    this.onQuestUpdate();
  }

  _acceptQuest(questId) {
    try {
      const result = this.questManager?.tryActivateQuest?.(questId) || this.questManager?.tryActivateSideQuest?.(questId);
      this._showToast(result?.message || `已接受任务：${questId}`);
    } catch (error) {
      this.onError(`Accept quest failed: ${error.message}`);
    }
    this.onQuestUpdate();
  }

  _progressQuest(questId) {
    try {
      const event = { type: 'complete_dialogue', questId };
      if (this.questManager?.reportQuestEvent) {
        this.questManager.reportQuestEvent(event);
      } else if (this.questManager?.updateObjectiveProgress) {
        this.questManager.updateObjectiveProgress(questId, 'talk_to_npc', 1);
      }
      this._showToast(`任务进度已更新：${questId}`);
    } catch (error) {
      this.onError(`Progress quest failed: ${error.message}`);
    }
    this.onQuestUpdate();
  }

  _unlockQuest(questId) {
    try {
      const side = this.questManager?.sideQuestStatus;
      const main = this.questManager?.questStatus;
      if (side && side[questId] === 'LOCKED') {
        side[questId] = 'AVAILABLE';
      } else if (main && main[questId] === 'LOCKED') {
        main[questId] = 'AVAILABLE';
      }
      this._showToast(`已解锁任务：${questId}`);
    } catch (error) {
      this.onError(`Unlock quest failed: ${error.message}`);
    }
    this.onQuestUpdate();
  }

  _startObjective({ questId, objectiveId }) {
    try {
      if (this.questManager?.updateObjectiveProgress) {
        this.questManager.updateObjectiveProgress(questId, objectiveId, 1);
      }
      this._showToast(`目标已启动：${objectiveId}`);
    } catch (error) {
      this.onError(`Start objective failed: ${error.message}`);
    }
    this.onQuestUpdate();
  }

  _removeItem(itemId) {
    const items = { ...(this.saveManager.getProgressField?.('items') || {}) };
    if (!items[itemId] || items[itemId] <= 0) return;
    items[itemId] -= 1;
    if (items[itemId] <= 0) delete items[itemId];
    this.saveManager.setProgressField('items', items);
    this._showToast(`已移除物品：${itemId}`);
  }

  _removeItems(itemIds) {
    if (!Array.isArray(itemIds)) return;
    for (const itemId of itemIds) this._removeItem(itemId);
  }

  _completeQuest(questId) {
    try {
      if (this.questManager?.isMainQuest?.(questId)) {
        this.questManager.completeQuest(questId, { force: true });
      } else {
        this.questManager?.completeSideQuest?.(questId, { force: true, runResult: { success: true } });
      }
      this._showToast(`已完成任务：${questId}`);
    } catch (error) {
      this.onError(`Complete quest failed: ${error.message}`);
    }
    this.onQuestUpdate();
  }

  _openShop(shopId) {
    const shop = getShopById(shopId);
    const items = getShopItems(shopId);
    const money = this._getMoney();
    const ownedItems = this._getOwnedItems();
    this.shopOpen = true;
    this.bodyEl.innerHTML = `
      <div class="npc-dialogue-shop-toolbar">
        <button class="hw-button hw-button-ghost" id="npc-shop-back">← 返回对话</button>
        <div class="npc-dialogue-wallet">金币 ${money}</div>
      </div>
      <div class="npc-dialogue-speaker">${shop?.name || '商店'}</div>
      <div class="npc-dialogue-text">${shop?.description || ''}</div>
      <div class="npc-dialogue-shop-grid"></div>
      <div class="npc-dialogue-summary">当前背包：${this._formatInventory(ownedItems)}</div>
    `;
    this.bodyEl.querySelector('#npc-shop-back').addEventListener('click', () => this._renderNode());
    const grid = this.bodyEl.querySelector('.npc-dialogue-shop-grid');
    items.forEach(item => {
      const card = document.createElement('button');
      card.className = 'npc-dialogue-shop-item';
      const affordable = money >= item.price;
      card.disabled = !affordable;
      card.innerHTML = `<div class="npc-dialogue-shop-item-icon">${item.icon || ''}</div><strong>${item.name}</strong><small>${item.description || ''}</small><div class="npc-dialogue-shop-owned">已拥有 ${ownedItems[item.itemId] || 0}</div><div class="price">${item.price} 金币${affordable ? '' : ' · 金币不足'}</div>`;
      card.addEventListener('click', () => this._buyItem(shopId, item.itemId));
      grid.appendChild(card);
    });
  }

  _getMoney() {
    if (typeof window !== 'undefined' && window.questTriggerManager && typeof window.questTriggerManager.characterStats?.money === 'number') {
      return window.questTriggerManager.characterStats.money;
    }
    return this.saveManager?.getStats?.()?.money || this.saveManager?.getProgress?.()?.money || 0;
  }

  _getOwnedItems() {
    if (typeof window !== 'undefined' && window.questTriggerManager && typeof window.questTriggerManager.getInventoryItems === 'function') {
      return window.questTriggerManager.getInventoryItems().reduce((acc, entry) => {
        acc[entry.itemId] = entry.quantity;
        return acc;
      }, {});
    }
    return this.saveManager?.getProgress?.()?.items || {};
  }

  _buyItem(shopId, itemId) {
    const item = getShopItems(shopId).find(candidate => candidate.itemId === itemId);
    if (!item) return;
    if (typeof window !== 'undefined' && window.questTriggerManager) {
      const qm = window.questTriggerManager;
      const money = qm.characterStats?.money || 0;
      if (money < item.price) {
        this._showToast('金币不足');
        return;
      }
      if ((shopId === 'canteen' || shopId === 'lab_shop') && !qm.hasItem('hust_card')) {
        this._showToast('需要校园卡才能在此消费');
        return;
      }
      qm.applyStatChanges({ money: -item.price }, 'shop');
      qm.addItem(itemId, 1, 'shop');
      qm.reportQuestEvent?.({ type: 'buy_item', itemId, item, shopId, quantity: 1 });
      qm.unlockAchievement?.('first_purchase', 'shop');
      if (item.usable) {
        qm.useItem(itemId, 1, 'shop');
      }
      this._showToast(`已购买：${item.name}`);
      this._openShop(shopId);
      return;
    }
    if (!this.saveManager) {
      this._showToast('存档不可用');
      return;
    }
    const progress = this.saveManager.getProgress?.() || {};
    if ((progress.money || 0) < item.price) {
      this._showToast('金币不足');
      return;
    }
    this.saveManager.setProgressField('money', (progress.money || 0) - item.price);
    const items = { ...(progress.items || {}) };
    items[itemId] = (items[itemId] || 0) + 1;
    this.saveManager.setProgressField('items', items);
    if (item.type === 'consumable' && item.effects) {
      const stats = this.saveManager.getStats?.() || {};
      for (const [key, delta] of Object.entries(item.effects)) {
        this.saveManager.setProgressField(key, (stats[key] || 0) + delta);
      }
    }
    this._showToast(`已购买：${item.name}`);
    this._openShop(shopId);
  }

  _recordHistory() {
    if (!this.saveManager || !this.npc) return;
    const history = { ...(this.saveManager.getProgressField?.('npcDialogueHistory') || {}) };
    const current = history[this.npc.npcId] || {};
    history[this.npc.npcId] = {
      ...current,
      lastTalkedAt: Date.now(),
      talkCount: (current.talkCount || 0) + 1
    };
    this.saveManager.setProgressField('npcDialogueHistory', history);
  }

  _showToast(message) {
    this.toast.textContent = message;
    this.toast.classList.add('show');
    setTimeout(() => this.toast.classList.remove('show'), 1800);
  }

  _formatInventory(items = {}) {
    const entries = Object.entries(items).filter(([, count]) => Number(count) > 0);
    if (entries.length === 0) return '空';
    return entries.map(([id, count]) => `${id} x${count}`).join(', ');
  }

  _statLabel(key) {
    const labels = {
      knowledge: '知识',
      social: '社交',
      stamina: '体能',
      mood: '心情',
      experience: '经验',
      money: '金币'
    };
    return labels[key] || key;
  }

  _formatEffects(effects = {}) {
    const parts = [];
    const clampStat = (val) => Math.max(0, Math.min(100, val));
    if (effects.stats) {
      for (const [key, delta] of Object.entries(effects.stats)) {
        const current = this._getCurrentStat(key);
        const effective = clampStat(current + delta);
        const label = this._statLabel(key);
        parts.push(`${label}${delta >= 0 ? '+' : ''}${delta}（最终${effective}）`);
      }
    }
    if (typeof effects.money === 'number') {
      const current = this._getCurrentStat('money');
      const effective = current + effects.money;
      parts.push(`金币${effects.money >= 0 ? '+' : ''}${effects.money}（最终${effective}）`);
    }
    if (typeof effects.experience === 'number') {
      const current = this._getCurrentStat('experience');
      const effective = current + effects.experience;
      parts.push(`经验${effects.experience >= 0 ? '+' : ''}${effects.experience}（最终${effective}）`);
    }
    if (effects.addItem) {
      const itemName = this._getItemName(effects.addItem);
      parts.push(`物品 ${itemName}`);
    }
    if (effects.startQuest) parts.push(`接受任务 ${effects.startQuest}`);
    if (effects.acceptQuest) parts.push(`接受任务 ${effects.acceptQuest}`);
    if (effects.progressQuest) parts.push(`推进任务 ${effects.progressQuest}`);
    if (effects.deliverQuest) parts.push(`交付任务 ${effects.deliverQuest}`);
    if (effects.completeQuest) parts.push(`完成任务 ${effects.completeQuest}`);
    if (effects.unlockQuest) parts.push(`解锁任务 ${effects.unlockQuest}`);
    if (effects.startObjective) parts.push(`目标 ${effects.startObjective.objectiveId}`);
    if (effects.removeItem) parts.push(`移除物品 ${this._getItemName(effects.removeItem)}`);
    if (effects.removeItems) parts.push(`移除物品 ${effects.removeItems.map(id => this._getItemName(id)).join(', ')}`);
    if (effects.shopOpen) parts.push('打开商店');
    if (effects.relation) {
      for (const [npcId, delta] of Object.entries(effects.relation)) parts.push(`${npcId} 好感${delta >= 0 ? '+' : ''}${delta}`);
    }
    return parts.join(' · ');
  }

  _getItemName(itemId) {
    return getItemById(itemId)?.name || itemId;
  }
}

export default NpcDialogueUI;
