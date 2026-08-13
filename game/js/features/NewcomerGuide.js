(function (global) {
  'use strict';

  const STORAGE_KEY = 'hust_world_newcomer_guide_seen';
  let root = null;

  function hasSeen() {
    try {
      return global.localStorage?.getItem(STORAGE_KEY) === 'true';
    } catch (_) {
      return false;
    }
  }

  function markSeen() {
    try {
      global.localStorage?.setItem(STORAGE_KEY, 'true');
    } catch (_) {
      // 本地存储不可用时仅在当前页面隐藏，不影响游戏运行。
    }
  }

  function dismiss() {
    markSeen();
    root?.classList.remove('is-visible');
  }

  function openHelp() {
    dismiss();
    global.gameDashboardUI?.openPanel?.('help');
  }

  function render() {
    if (!root) return;
    root.innerHTML = `
      <section class="newcomer-guide-card" role="dialog" aria-modal="true" aria-labelledby="newcomer-guide-title">
        <p class="newcomer-guide-kicker">第一次进入校园</p>
        <h2 id="newcomer-guide-title">从南大门开始</h2>
        <p class="newcomer-guide-intro">不需要记住所有功能。先完成下面三步，就能自然开始你的校园生活。</p>
        <ol class="newcomer-guide-steps">
          <li><strong>前往迎新点</strong><span>使用 WASD 或方向键移动，地图已将你放在南大门。</span></li>
          <li><strong>完成第一段对话</strong><span>靠近迎新志愿者，按 E 与其交谈并领取第一个任务。</span></li>
          <li><strong>查看任务与保存</strong><span>底部“任务”可查看目标；重要进度可随时点击“保存”。</span></li>
        </ol>
        <div class="newcomer-guide-actions">
          <button type="button" class="newcomer-guide-secondary" data-guide-action="help">查看完整操作</button>
          <button type="button" class="newcomer-guide-primary" data-guide-action="start">开始探索</button>
        </div>
      </section>`;
    root.querySelector('[data-guide-action="start"]')?.addEventListener('click', dismiss);
    root.querySelector('[data-guide-action="help"]')?.addEventListener('click', openHelp);
  }

  function init() {
    if (!global.document || root) return api;
    root = global.document.createElement('div');
    root.id = 'newcomer-guide-root';
    global.document.body.appendChild(root);
    render();
    if (!hasSeen()) root.classList.add('is-visible');
    return api;
  }

  function reset() {
    try { global.localStorage?.removeItem(STORAGE_KEY); } catch (_) {}
    if (!root) init();
    root?.classList.add('is-visible');
  }

  const api = { init, dismiss, reset, hasSeen };
  global.NewcomerGuide = api;
})(typeof window !== 'undefined' ? window : globalThis);
