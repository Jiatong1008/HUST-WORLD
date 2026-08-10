const { chromium } = require('playwright');
const { startServer, stopServer } = require('./test-server-helper.js');

const PORT = process.env.PORT || '8080';
const BASE_URL = (process.env.BROWSER_TEST_BASE || process.env.SMOKE_API_BASE || `http://localhost:${PORT}`).replace(/\/$/, '');
const TEST_URL = `${BASE_URL}/tools/tests/test-inventory-system.html`;
const SUCCESS_SCREENSHOT = 'tools/tests/test-inventory-system-result.png';
const ERROR_SCREENSHOT = 'tools/tests/test-inventory-system-error.png';

(async () => {
  await startServer(PORT);
  console.log(`[背包系统浏览器验收] 启动 Chromium，访问 ${TEST_URL}`);
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  const jsErrors = [];
  page.on('console', msg => {
    console.log(`[PAGE CONSOLE] ${msg.type()}: ${msg.text()}`);
  });
  page.on('pageerror', err => {
    jsErrors.push(err.message);
    console.log(`[PAGE ERROR] ${err.message}`);
  });
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`[HTTP ${response.status()}] ${response.url()}`);
    }
  });

  async function screenshot(path) {
    await page.screenshot({ path });
    console.log(`[截图] 已保存到 ${path}`);
  }

  async function fail(message) {
    console.error(`[❌] 浏览器验收失败: ${message}`);
    await screenshot(ERROR_SCREENSHOT);
    await browser.close();
    await stopServer();
    process.exit(1);
  }

  try {
    await page.goto(TEST_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(600);
    if (jsErrors.length > 0) throw new Error(`页面加载 JS 错误: ${jsErrors.join('; ')}`);
    console.log('[检查] 页面加载无 JS 错误');

    const initOk = await page.evaluate(() => !!window.questManager && !!window.saveManager);
    if (!initOk) throw new Error('questManager / saveManager 未挂载');
    console.log('[检查] 全局对象挂载');

    const initialItems = await page.evaluate(() => window.questManager.getInventoryItems());
    console.log('[检查] 初始背包:', initialItems);

    await page.click('button[onclick="window.addCoffee()"]');
    await page.waitForTimeout(300);
    let coffeeQty = await page.evaluate(() => window.questManager.getItemQuantity('coffee'));
    console.log(`[检查] 添加 coffee 后: ${coffeeQty}`);
    if (coffeeQty !== 1) throw new Error('addItem 后 coffee 数量未增加');

    await page.click('button[onclick="window.addCoffee()"]');
    await page.click('button[onclick="window.addCoffee()"]');
    await page.click('button[onclick="window.addCoffee()"]');
    await page.waitForTimeout(300);
    coffeeQty = await page.evaluate(() => window.questManager.getItemQuantity('coffee'));
    console.log(`[检查] 添加 3 次 coffee 后: ${coffeeQty}`);
    if (coffeeQty !== 4) throw new Error('coffee 堆叠数量错误');

    await page.click('button[onclick="window.removeCoffee()"]');
    await page.waitForTimeout(300);
    coffeeQty = await page.evaluate(() => window.questManager.getItemQuantity('coffee'));
    console.log(`[检查] 移除 coffee 后: ${coffeeQty}`);
    if (coffeeQty !== 3) throw new Error('removeItem 后 coffee 数量错误');

    const removeResult = await page.evaluate(() => {
      const qty = window.questManager.getItemQuantity('coffee');
      const res = window.questManager.removeItem('coffee', 100, 'debug');
      return { beforeQty: qty, success: res.success, afterQty: window.questManager.getItemQuantity('coffee') };
    });
    console.log(`[检查] 超额移除 coffee:`, removeResult);
    if (removeResult.success) throw new Error('超额移除应失败');
    if (removeResult.afterQty < 0) throw new Error('coffee 数量不能为负数');
    if (removeResult.afterQty !== 3) throw new Error('超额移除不应改变数量');

    const beforeStamina = await page.evaluate(() => {
      window.questManager.characterStats.stamina = 50;
      return window.questManager.characterStats.stamina;
    });
    await page.click('button[onclick="window.useCoffee()"]');
    await page.waitForTimeout(300);
    const afterStamina = await page.evaluate(() => window.questManager.characterStats.stamina);
    coffeeQty = await page.evaluate(() => window.questManager.getItemQuantity('coffee'));
    console.log(`[检查] 使用 coffee: 体力 ${beforeStamina} -> ${afterStamina}, 数量 ${coffeeQty}`);
    if (coffeeQty !== 2) throw new Error('使用 coffee 后数量未减少');
    if (afterStamina !== beforeStamina + 10) throw new Error('coffee 体力效果未生效');

    const nonUsable = await page.evaluate(() => window.questManager.useItem('study_notes', 1, 'debug'));
    console.log(`[检查] 不可使用物品 study_notes:`, nonUsable);
    if (nonUsable.success) throw new Error('任务物品不应允许使用');

    await page.click('button[onclick="window.simulateShopPurchase()"]');
    await page.waitForTimeout(300);
    const shopState = await page.evaluate(() => ({
      money: window.questManager.characterStats.money,
      coffee: window.questManager.getItemQuantity('coffee')
    }));
    console.log(`[检查] 商店购买后:`, shopState);
    if (shopState.money !== 990) throw new Error('商店购买金币未减少');
    if (shopState.coffee !== 3) throw new Error('商店购买后 coffee 数量未增加');

    await page.click('button[onclick="window.simulateQuestReward()"]');
    await page.waitForTimeout(300);
    const rewardState = await page.evaluate(() => ({
      studyNotes: window.questManager.getItemQuantity('study_notes'),
      coffee: window.questManager.getItemQuantity('coffee')
    }));
    console.log(`[检查] 任务奖励后:`, rewardState);
    if (rewardState.studyNotes !== 1) throw new Error('任务奖励 study_notes 未增加');
    if (rewardState.coffee !== 5) throw new Error('任务奖励 coffee 未增加');

    const beforeSave = await page.evaluate(() => ({
      coffee: window.questManager.getItemQuantity('coffee'),
      studyNotes: window.questManager.getItemQuantity('study_notes')
    }));
    await page.click('button[onclick="window.saveAndRefresh()"]');
    await page.waitForTimeout(1500);
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.waitForTimeout(600);
    const afterSave = await page.evaluate(() => ({
      coffee: window.questManager.getItemQuantity('coffee'),
      studyNotes: window.questManager.getItemQuantity('study_notes')
    }));
    console.log(`[检查] 保存刷新后:`, beforeSave, '->', afterSave);
    if (afterSave.coffee !== beforeSave.coffee) throw new Error('刷新后 coffee 未保留');
    if (afterSave.studyNotes !== beforeSave.studyNotes) throw new Error('刷新后 study_notes 未保留');

    await page.evaluate(() => {
      const saveKey = 'hust_world_save_v1';
      const snapshot = JSON.parse(localStorage.getItem(saveKey) || '{}');
      snapshot.progress = {
        items: [
          { itemId: 'coffee', count: 3 },
          { itemId: 'sports_drink', count: 2 }
        ]
      };
      localStorage.setItem(saveKey, JSON.stringify(snapshot));
      if (window.saveManager && typeof window.saveManager.saveLocal === 'function') {
        window.saveManager.saveLocal = () => {};
      }
      if (window.saveManager && typeof window.saveManager.saveLocalSync === 'function') {
        window.saveManager.saveLocalSync = () => {};
      }
    });
    jsErrors.length = 0;
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(600);
    if (jsErrors.length > 0) throw new Error(`旧 items 数组迁移后 JS 错误: ${jsErrors.join('; ')}`);
    const migratedArray = await page.evaluate(() => ({
      coffee: window.questManager.getItemQuantity('coffee'),
      sportsDrink: window.questManager.getItemQuantity('sports_drink')
    }));
    console.log(`[检查] 旧 items 数组迁移后:`, migratedArray);
    if (migratedArray.coffee !== 3) throw new Error('旧 items 数组 coffee 未迁移');
    if (migratedArray.sportsDrink !== 2) throw new Error('旧 items 数组 sports_drink 未迁移');

    await page.evaluate(() => {
      const saveKey = 'hust_world_save_v1';
      const snapshot = JSON.parse(localStorage.getItem(saveKey) || '{}');
      snapshot.progress = {
        inventoryCounts: { coffee: 5, study_notes: 2 }
      };
      localStorage.setItem(saveKey, JSON.stringify(snapshot));
      if (window.saveManager && typeof window.saveManager.saveLocal === 'function') {
        window.saveManager.saveLocal = () => {};
      }
      if (window.saveManager && typeof window.saveManager.saveLocalSync === 'function') {
        window.saveManager.saveLocalSync = () => {};
      }
    });
    jsErrors.length = 0;
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(600);
    if (jsErrors.length > 0) throw new Error(`旧 inventoryCounts 迁移后 JS 错误: ${jsErrors.join('; ')}`);
    const migratedCounts = await page.evaluate(() => ({
      coffee: window.questManager.getItemQuantity('coffee'),
      studyNotes: window.questManager.getItemQuantity('study_notes')
    }));
    console.log(`[检查] 旧 inventoryCounts 迁移后:`, migratedCounts);
    if (migratedCounts.coffee !== 5) throw new Error('旧 inventoryCounts coffee 未迁移');
    if (migratedCounts.studyNotes !== 2) throw new Error('旧 inventoryCounts study_notes 未迁移');

    await screenshot(SUCCESS_SCREENSHOT);
    console.log('[✅] test-inventory-system.html 背包系统浏览器验收通过');
  } catch (e) {
    await fail(e.message);
  } finally {
    await browser.close();
    await stopServer();
  }
})();
