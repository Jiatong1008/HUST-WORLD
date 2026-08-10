/**
 * QuestMapUIBootstrap.js — 非模块引导脚本，动态加载 QuestMapUI 模块
 * 用于避免某些浏览器/环境下模块脚本不执行的问题
 */
(function () {
  function tryInit() {
    if (typeof window === 'undefined') return;
    if (window.__questMapUIBootstrapped) return;
    window.__questMapUIBootstrapped = true;

    import('./QuestMapUI.js?v=3')
      .then((mod) => {
        const init = mod.default || mod.initQuestMapUI;
        if (typeof init === 'function') {
          init();
          console.log('[QuestMapUIBootstrap] QuestMapUI 初始化已触发');
        } else {
          console.warn('[QuestMapUIBootstrap] 模块未导出 init 函数');
        }
      })
      .catch((err) => {
        console.error('[QuestMapUIBootstrap] 加载 QuestMapUI 模块失败:', err.message);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit);
  } else {
    tryInit();
  }
})();
