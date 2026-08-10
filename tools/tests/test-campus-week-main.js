const logEl = document.getElementById('test-log');
const statusEl = document.getElementById('test-status');
const results = [];

function assert(condition, message) {
  results.push({ ok: !!condition, message });
  const item = document.createElement('div');
  item.className = condition ? 'pass' : 'fail';
  item.textContent = `${condition ? '✅' : '❌'} ${message}`;
  logEl.appendChild(item);
}

function run() {
  localStorage.removeItem('hust_world_save_v1');
  window.CampusWeekManager.init();
  window.CampusWeekManager.reset();

  assert(document.getElementById('campus-week-root'), '叙事模块已挂载到页面');
  assert(document.querySelector('.campus-week-launcher'), '主游戏可见“喻园第一周”入口');
  window.CampusWeekManager.open();
  assert(document.querySelector('.campus-week-overlay[aria-hidden="false"]'), '点击入口后打开叙事面板');
  assert(window.CampusWeekManager.getAvailableChapter().id === 'day0', '新存档从 Day 0 开始');
  assert(document.querySelector('.campus-week-visual img').getAttribute('src').includes('gate.webp'), 'Day 0 正确加载校门场景素材');

  assert(window.CampusWeekManager.choose('day0', 'walk-with-volunteer'), 'Day 0 选择可提交');
  assert(window.CampusWeekManager.getAvailableChapter().id === 'day2', '完成 Day 0 后解锁 Day 2');
  assert(window.CampusWeekManager.choose('day2', 'compare-ai-sources'), 'Day 2 图书馆学习选择可提交');
  assert(window.CampusWeekManager.getAvailableChapter().id === 'day5', '完成 Day 2 后解锁 Day 5');
  assert(window.CampusWeekManager.choose('day5', 'write-night-note'), 'Day 5 夜游选择可提交');
  assert(window.CampusWeekManager.getAvailableChapter().id === 'day7', '完成 Day 5 后解锁 Day 7');
  assert(window.CampusWeekManager.choose('day7', 'pass-on-map'), 'Day 7 回馈选择可提交');

  const finished = window.CampusWeekManager.getState();
  assert(finished.completed.length === 4, '四个主线片段均记录为完成');
  assert(finished.memories.length === 4, '四个选择均生成记忆卡');
  assert(finished.ending && finished.ending.title, '结局已根据玩家选择生成');
  assert(document.querySelector('.campus-week-ending'), '完成后页面展示闭环结局');
  assert(JSON.parse(localStorage.getItem('hust_world_save_v1')).progress.campusWeek.completed.length === 4, '叙事进度已写入统一存档');

  window.CampusWeekManager.reset();
  const reset = window.CampusWeekManager.getState();
  assert(reset.completed.length === 0 && reset.memories.length === 0, '重新体验会清空仅属于本周的叙事进度');

  const passed = results.every(result => result.ok);
  statusEl.textContent = passed ? `✅ 测试通过（${results.length}/${results.length}）` : `❌ 测试失败（${results.filter(result => !result.ok).length} 项未通过）`;
  statusEl.className = passed ? 'success' : 'error';
  window.__testResults = { passed, results };
}

try { run(); } catch (error) {
  assert(false, `测试运行异常：${error.message}`);
  statusEl.textContent = '❌ 测试运行异常';
  statusEl.className = 'error';
  window.__testResults = { passed: false, results };
}
