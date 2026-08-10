import { QuestTriggerManager } from '../../game/js/managers/QuestTriggerManager.js';
import { getItemById } from '../../game/js/config/ItemConfig.js';

const questManager = new QuestTriggerManager();
window.questManager = questManager;

window.saveManager = window.saveManager || new window.SaveManager();

function showToast(message, color = '#FFD700') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.borderColor = color;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function logLine(text, type = 'ok') {
  const log = document.getElementById('logPanel');
  const line = document.createElement('div');
  line.className = `log-line log-${type}`;
  line.textContent = text;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

function refreshUI() {
  const stats = questManager.characterStats;
  document.getElementById('moneyValue').textContent = stats.money;
  document.getElementById('staminaValue').textContent = stats.stamina;
  document.getElementById('knowledgeValue').textContent = stats.knowledge;
  document.getElementById('socialValue').textContent = stats.social;
  document.getElementById('moodValue').textContent = stats.mood;

  const inventoryList = document.getElementById('inventoryList');
  inventoryList.innerHTML = '';

  const items = questManager.getInventoryItems();
  if (items.length === 0) {
    inventoryList.innerHTML = `
      <div class="item-card">
        <div class="item-icon">🎒</div>
        <div class="item-name">背包为空</div>
        <div class="item-category">等待添加物品</div>
      </div>
    `;
  } else {
    for (const entry of items) {
      const itemDef = getItemById(entry.itemId) || {};
      const row = document.createElement('div');
      row.className = 'item-card';
      const icon = itemDef.category === 'consumable' ? '⚗️' : (itemDef.category === 'material' ? '📜' : '📦');
      row.innerHTML = `
        <div class="item-icon">${icon}</div>
        <div class="item-name">${itemDef.name || entry.itemId}</div>
        <div class="item-category">${itemDef.category || ''}</div>
        <div class="item-qty">x${entry.quantity}</div>
        <div class="item-usable ${itemDef.usable ? 'usable-yes' : 'usable-no'}">${itemDef.usable ? '可使用' : '不可使用'}</div>
      `;
      inventoryList.appendChild(row);
    }
  }

  const snapshot = window.saveManager.buildSnapshot();
  const progress = snapshot.progress || {};
  document.getElementById('inventoryJsonPanel').textContent = JSON.stringify({
    inventory: progress.inventory,
    items: progress.items
  }, null, 2);
}

function initDebug() {
  questManager.init({
    id: 'debug-inventory-character',
    characterName: '调试角色',
    college: '计算机科学与技术学院',
    level: 1,
    experience: 0,
    money: 1000,
    stamina: 100,
    maxStamina: 100,
    mood: 50,
    social: 50,
    knowledge: 50
  });

  const saved = window.saveManager.loadLocal();
  if (saved && saved.progress) {
    questManager.loadProgress(saved.progress, true);
  }

  questManager.addListener('inventory:changed', () => refreshUI());
  questManager.addListener('character:updated', () => refreshUI());

  refreshUI();
  logLine('背包与物品系统调试页已初始化', 'ok');
}

window.addCoffee = function () {
  const before = questManager.getItemQuantity('coffee');
  questManager.addItem('coffee', 1, 'debug');
  const after = questManager.getItemQuantity('coffee');
  logLine(`添加 coffee: ${before} -> ${after}`, 'ok');
  refreshUI();
};

window.addStudyNotes = function () {
  const before = questManager.getItemQuantity('study_notes');
  questManager.addItem('study_notes', 1, 'debug');
  const after = questManager.getItemQuantity('study_notes');
  logLine(`添加 study_notes: ${before} -> ${after}`, 'ok');
  refreshUI();
};

window.addLabRecord = function () {
  const before = questManager.getItemQuantity('lab_record');
  questManager.addItem('lab_record', 1, 'debug');
  const after = questManager.getItemQuantity('lab_record');
  logLine(`添加 lab_record: ${before} -> ${after}`, 'ok');
  refreshUI();
};

window.useCoffee = function () {
  const result = questManager.useItem('coffee', 1, 'debug');
  if (result.success) {
    logLine(`使用 coffee: ${result.beforeQuantity} -> ${result.afterQuantity}，体力 +${result.statResult.changes.stamina || 0}`, 'ok');
    showToast('已使用 coffee');
  } else {
    logLine(`使用 coffee 失败: ${result.message}`, 'warn');
  }
  refreshUI();
};

window.useSportsDrink = function () {
  const result = questManager.useItem('sports_drink', 1, 'debug');
  if (result.success) {
    logLine(`使用 sports_drink: ${result.beforeQuantity} -> ${result.afterQuantity}，体力 +${result.statResult.changes.stamina || 0}`, 'ok');
    showToast('已使用 sports_drink');
  } else {
    logLine(`使用 sports_drink 失败: ${result.message}`, 'warn');
  }
  refreshUI();
};

window.removeCoffee = function () {
  const result = questManager.removeItem('coffee', 1, 'debug');
  if (result.success) {
    logLine(`移除 coffee: ${result.beforeQuantity} -> ${result.afterQuantity}`, 'ok');
  } else {
    logLine(`移除 coffee 失败: ${result.message}`, 'warn');
  }
  refreshUI();
};

window.simulateQuestReward = function () {
  questManager.addItem('study_notes', 1, 'quest_reward');
  questManager.addItem('coffee', 2, 'quest_reward');
  logLine('模拟任务奖励：study_notes x1, coffee x2', 'ok');
  refreshUI();
};

window.simulateShopPurchase = function () {
  const price = 10;
  const beforeMoney = questManager.characterStats.money;
  questManager.applyStatChanges({ money: -price }, 'shop');
  const result = questManager.addItem('coffee', 1, 'shop');
  const afterMoney = questManager.characterStats.money;
  logLine(`模拟商店购买 coffee: 金币 ${beforeMoney} -> ${afterMoney}, 数量 ${result.beforeQuantity} -> ${result.afterQuantity}`, 'ok');
  refreshUI();
};

window.saveAndRefresh = function () {
  window.saveManager.save().then(() => {
    logLine('已保存到本地存档', 'ok');
    window.location.reload();
  }).catch((error) => {
    logLine(`保存失败: ${error.message}`, 'warn');
  });
};

window.resetInventory = function () {
  questManager.inventory = { items: {}, capacity: 99, updatedAt: null };
  questManager.characterStats = {
    level: 1,
    experience: 0,
    money: 1000,
    stamina: 100,
    maxStamina: 100,
    mood: 50,
    social: 50,
    knowledge: 50
  };
  window.saveManager.save();
  refreshUI();
  logLine('已重置背包与属性', 'warn');
};

window.migrateOldItemsArray = function () {
  const snapshot = window.saveManager.loadLocal() || window.saveManager.buildInitialSnapshot();
  snapshot.progress.items = [
    { itemId: 'coffee', count: 3 },
    { itemId: 'sports_drink', count: 1 }
  ];
  delete snapshot.progress.inventory;
  window.saveManager.saveLocal(snapshot);
  window.location.reload();
};

window.migrateOldInventoryCounts = function () {
  const snapshot = window.saveManager.loadLocal() || window.saveManager.buildInitialSnapshot();
  snapshot.progress.inventoryCounts = { coffee: 5, study_notes: 2 };
  delete snapshot.progress.inventory;
  window.saveManager.saveLocal(snapshot);
  window.location.reload();
};

initDebug();
