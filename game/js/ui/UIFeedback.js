const UIFeedback = (() => {
  const toastContainerId = 'hw-toast-container';
  const stateKey = '__hw_feedback_state__';

  function _getState() {
    window[stateKey] = window[stateKey] || {};
    return window[stateKey];
  }

  function _ensureToastContainer() {
    let container = document.getElementById(toastContainerId);
    if (!container) {
      container = document.createElement('div');
      container.id = toastContainerId;
      container.className = 'hw-toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  function _getTarget(targetOrSelector) {
    if (!targetOrSelector) return null;
    if (typeof targetOrSelector === 'string') {
      return document.querySelector(targetOrSelector);
    }
    if (targetOrSelector instanceof Element) return targetOrSelector;
    return null;
  }

  function _safeWarn(message) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(`[UIFeedback] ${message}`);
    }
  }

  function _clearStateOverlay(target) {
    const state = _getState();
    if (!target) return;
    const key = target.dataset?.hwFeedbackKey;
    if (key && state[key]) {
      const old = state[key];
      if (old && old.parentNode) old.remove();
      delete state[key];
    }
  }

  function _generateKey() {
    return `hw-feedback-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }

  function showToast(message, type = 'info', duration = 3000) {
    if (typeof message !== 'string') return;
    const container = _ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = `hw-toast hw-toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('hw-show');
    });

    setTimeout(() => {
      toast.classList.remove('hw-show');
      setTimeout(() => {
        if (toast.parentNode) toast.remove();
      }, 250);
    }, Math.max(1000, Number(duration) || 3000));
  }

  function showLoading(targetOrSelector, text = '加载中...') {
    const target = _getTarget(targetOrSelector);
    if (!target) {
      _safeWarn(`showLoading target not found: ${targetOrSelector}`);
      return;
    }
    _clearStateOverlay(target);
    const state = _getState();
    const key = _generateKey();
    target.dataset.hwFeedbackKey = key;

    const overlay = document.createElement('div');
    overlay.className = 'hw-loading-state';
    overlay.style.cssText = 'position:absolute;inset:0;background:rgba(15,23,42,0.92);z-index:10;border-radius:inherit;';
    overlay.innerHTML = `<div class="hw-spinner"></div><div>${text}</div>`;
    overlay.dataset.hwFeedbackOverlay = 'true';

    const computed = getComputedStyle(target);
    if (computed.position === 'static') {
      target.style.position = 'relative';
    }
    target.appendChild(overlay);
    state[key] = overlay;
  }

  function hideLoading(targetOrSelector) {
    const target = _getTarget(targetOrSelector);
    if (!target) {
      _safeWarn(`hideLoading target not found: ${targetOrSelector}`);
      return;
    }
    _clearStateOverlay(target);
  }

  function showEmptyState(targetOrSelector, text = '暂无数据') {
    const target = _getTarget(targetOrSelector);
    if (!target) {
      _safeWarn(`showEmptyState target not found: ${targetOrSelector}`);
      return;
    }
    _clearStateOverlay(target);
    const state = _getState();
    const key = _generateKey();
    target.dataset.hwFeedbackKey = key;

    const overlay = document.createElement('div');
    overlay.className = 'hw-empty-state';
    overlay.style.cssText = 'position:absolute;inset:0;background:transparent;z-index:10;border-radius:inherit;';
    overlay.innerHTML = `<div class="hw-empty-state-icon">📭</div><div>${text}</div>`;
    overlay.dataset.hwFeedbackOverlay = 'true';

    const computed = getComputedStyle(target);
    if (computed.position === 'static') {
      target.style.position = 'relative';
    }
    target.appendChild(overlay);
    state[key] = overlay;
  }

  function showError(targetOrSelector, message = '出错了') {
    const target = _getTarget(targetOrSelector);
    if (!target) {
      _safeWarn(`showError target not found: ${targetOrSelector}`);
      return;
    }
    _clearStateOverlay(target);
    const state = _getState();
    const key = _generateKey();
    target.dataset.hwFeedbackKey = key;

    const overlay = document.createElement('div');
    overlay.className = 'hw-error-state';
    overlay.style.cssText = 'position:absolute;inset:0;background:rgba(15,23,42,0.94);z-index:10;border-radius:inherit;';
    overlay.innerHTML = `<div class="hw-error-state-icon">⚠️</div><div>${message}</div>`;
    overlay.dataset.hwFeedbackOverlay = 'true';

    const computed = getComputedStyle(target);
    if (computed.position === 'static') {
      target.style.position = 'relative';
    }
    target.appendChild(overlay);
    state[key] = overlay;
  }

  function confirmAction(message) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'hw-modal hw-open';
      overlay.style.zIndex = '10001';
      overlay.innerHTML = `
        <div class="hw-panel hw-modal-content" style="width:min(400px,92vw);">
          <div class="hw-modal-header">
            <div class="hw-modal-title">请确认</div>
            <button class="hw-button hw-button-ghost hw-icon-button" data-action="cancel" style="width:32px;height:32px;font-size:18px;">✕</button>
          </div>
          <div class="hw-modal-body" style="padding:20px 24px;">
            <div class="hw-text-muted">${message}</div>
          </div>
          <div class="hw-modal-footer">
            <button class="hw-button hw-button-secondary" data-action="cancel">取消</button>
            <button class="hw-button hw-button-primary" data-action="confirm">确定</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      const handle = (e) => {
        const action = e.target?.dataset?.action;
        if (action === 'confirm') {
          cleanup();
          resolve(true);
        } else if (action === 'cancel') {
          cleanup();
          resolve(false);
        }
      };

      const cleanup = () => {
        overlay.removeEventListener('click', handle);
        overlay.remove();
      };

      overlay.addEventListener('click', handle);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          cleanup();
          resolve(false);
        }
      });
    });
  }

  return {
    showToast,
    showLoading,
    hideLoading,
    showEmptyState,
    showError,
    confirmAction
  };
})();

if (typeof window !== 'undefined') {
  window.UIFeedback = UIFeedback;
}

export default UIFeedback;
