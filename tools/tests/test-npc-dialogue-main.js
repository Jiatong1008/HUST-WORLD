import { NPC_LIST, getNpcById } from '../../game/js/config/NpcConfig.js';
import { getShopItems } from '../../game/js/config/ItemConfig.js';
import { NpcDialogueUI } from '../../game/js/ui/NpcDialogueUI.js';
import { QuestTriggerManager } from '../../game/js/managers/QuestTriggerManager.js';

const SaveManager = window.SaveManager;
if (!SaveManager) throw new Error('SaveManager is not loaded');

const logEl = document.getElementById('log');
const npcListEl = document.getElementById('npc-list');
const progressEl = document.getElementById('progress');
const filterEl = document.getElementById('filter-location');

const saveManager = new SaveManager();
const questManager = new QuestTriggerManager();
window.saveManager = saveManager;
window.questTriggerManager = questManager;
questManager.init({ saveManager });

const dialogueUI = new NpcDialogueUI({
  saveManager,
  questManager,
  onClose: () => log('对话结束'),
  onQuestUpdate: () => refreshProgress(),
  onError: message => log(`异常: ${message}`)
});
window.npcDialogueUI = dialogueUI;

function log(message) {
  const time = new Date().toLocaleTimeString();
  logEl.textContent += `[${time}] ${message}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

function ensureProgressDefaults() {
  const progress = saveManager.getProgress() || {};
  if (progress.money === undefined) saveManager.setProgressField('money', 1000);
  if (!progress.npcRelations) saveManager.setProgressField('npcRelations', {});
  if (!progress.npcDialogueHistory) saveManager.setProgressField('npcDialogueHistory', {});
  if (!progress.items) saveManager.setProgressField('items', {});
}

function refreshProgress() {
  ensureProgressDefaults();
  const progress = saveManager.getProgress() || {};
  progressEl.textContent = JSON.stringify({
    money: progress.money,
    knowledge: progress.knowledge,
    npcRelations: progress.npcRelations,
    npcDialogueHistory: progress.npcDialogueHistory,
    items: progress.items
  }, null, 2);
}

function loadLocations() {
  const locations = new Set();
  NPC_LIST.forEach(npc => {
    if (npc.defaultLocation) locations.add(npc.defaultLocation);
    if (npc.sceneId) locations.add(npc.sceneId);
  });
  [...locations].sort().forEach(location => {
    const option = document.createElement('option');
    option.value = location;
    option.textContent = location;
    filterEl.appendChild(option);
  });
}

function renderNpcs(filter = '') {
  npcListEl.innerHTML = '';
  const list = filter ? NPC_LIST.filter(npc => npc.defaultLocation === filter || npc.sceneId === filter) : NPC_LIST;
  list.forEach(npc => {
    const quests = [...(npc.questIds || []), ...(npc.sideQuestIds || [])];
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>${npc.name}</h3>
      <p>${npc.title || ''} - ${npc.defaultLocation || npc.sceneId || 'unknown'}</p>
      <p>任务: ${quests.join(', ') || '无'}</p>
      <div class="actions">
        <button data-open="${npc.npcId}">交谈</button>
        <button data-complete="${npc.npcId}">交付</button>
      </div>
    `;
    npcListEl.appendChild(card);
  });
  npcListEl.querySelectorAll('[data-open]').forEach(button => {
    button.addEventListener('click', () => {
      const npcId = button.dataset.open;
      dialogueUI.open(npcId);
      log(`打开 NPC: ${npcId}`);
    });
  });
  npcListEl.querySelectorAll('[data-complete]').forEach(button => {
    button.addEventListener('click', async () => {
      const npc = getNpcById(button.dataset.complete);
      for (const questId of [...(npc?.questIds || []), ...(npc?.sideQuestIds || [])]) {
        try {
          if (questManager.isMainQuest?.(questId)) await questManager.completeQuest(questId, { force: true });
          else await questManager.completeSideQuest?.(questId, { force: true, runResult: { success: true } });
          log(`完成任务: ${questId}`);
        } catch (error) {
          log(`任务失败: ${questId} - ${error.message}`);
        }
      }
      refreshProgress();
    });
  });
}

function setupToolbar() {
  document.getElementById('btn-load').addEventListener('click', () => {
    renderNpcs(filterEl.value);
    log(`已加载 ${NPC_LIST.length} 个 NPC`);
  });
  filterEl.addEventListener('change', () => renderNpcs(filterEl.value));
  document.getElementById('btn-reset').addEventListener('click', () => {
    window.debugResetNpcProgress();
    log('NPC 进度已重置');
  });
  document.getElementById('btn-export').addEventListener('click', () => {
    log(JSON.stringify(saveManager.getProgress() || {}, null, 2));
  });
  document.getElementById('btn-give-money').addEventListener('click', () => {
    const progress = saveManager.getProgress() || {};
    saveManager.setProgressField('money', (progress.money || 0) + 100);
    refreshProgress();
  });
  document.getElementById('btn-give-knowledge').addEventListener('click', () => {
    const stats = saveManager.getStats();
    saveManager.setProgressField('knowledge', (stats.knowledge || 0) + 100);
    refreshProgress();
  });
}

window.debugListNpcs = () => NPC_LIST;
window.debugOpenNpc = npcId => dialogueUI.open(npcId);
window.debugRunNpcDialogue = (npcId, dialogueId) => dialogueId ? dialogueUI.openByDialogueId(dialogueId) : dialogueUI.open(npcId);
window.debugBuyItem = (npcId, itemId) => {
  const npc = getNpcById(npcId);
  if (!npc?.shopId) return { success: false, error: 'NPC has no shop' };
  const item = getShopItems(npc.shopId).find(candidate => candidate.itemId === itemId);
  if (!item) return { success: false, error: 'Item not found' };
  const progress = saveManager.getProgress() || {};
  if ((progress.money || 0) < item.price) return { success: false, error: 'Not enough money' };
  saveManager.setProgressField('money', (progress.money || 0) - item.price);
  const items = { ...(progress.items || {}) };
  items[itemId] = (items[itemId] || 0) + 1;
  saveManager.setProgressField('items', items);
  refreshProgress();
  return { success: true };
};
window.debugResetNpcProgress = () => {
  saveManager.setProgressField('npcRelations', {});
  saveManager.setProgressField('npcDialogueHistory', {});
  saveManager.setProgressField('items', {});
  refreshProgress();
  return true;
};
window.debugExportNpcProgress = () => saveManager.getProgress();

ensureProgressDefaults();
loadLocations();
setupToolbar();
refreshProgress();
renderNpcs();
log('NPC debug page ready');
