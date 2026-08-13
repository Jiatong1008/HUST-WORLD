const results = [];
const log = document.getElementById('test-log');

function assert(condition, message) {
  results.push({ ok: !!condition, message });
  const line = document.createElement('div');
  line.textContent = `${condition ? 'PASS' : 'FAIL'} ${message}`;
  log.appendChild(line);
}

try {
  localStorage.removeItem('hust_world_newcomer_guide_seen');
  let openedPanel = null;
  window.gameDashboardUI = { openPanel: panel => { openedPanel = panel; } };

  window.NewcomerGuide.init();
  const root = document.getElementById('newcomer-guide-root');
  assert(!!root, '新手指引挂载到页面');
  assert(root.classList.contains('is-visible'), '首次进入显示指引');
  assert(root.querySelectorAll('.newcomer-guide-steps li').length === 3, '显示三步新手路线');
  assert(!/[🧭📚🌙🪪]/u.test(root.textContent), '指引不使用花哨图标');

  root.querySelector('[data-guide-action="help"]').click();
  assert(openedPanel === 'help', '完整操作入口会打开帮助面板');
  assert(!root.classList.contains('is-visible'), '打开帮助后收起引导');
  assert(localStorage.getItem('hust_world_newcomer_guide_seen') === 'true', '完成操作后记录已看过指引');

  window.NewcomerGuide.reset();
  assert(root.classList.contains('is-visible'), '重置后可以再次显示指引');
  root.querySelector('[data-guide-action="start"]').click();
  assert(!root.classList.contains('is-visible'), '开始探索会关闭指引');
} catch (error) {
  assert(false, `测试运行异常：${error.message}`);
}

window.__testResults = { passed: results.every(result => result.ok), results };
