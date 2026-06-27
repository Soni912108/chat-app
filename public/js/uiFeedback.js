(function () {
  // Temporary visual test delay for the shared loading overlay.
  // Remove after validating the spinner behavior in the UI.
  const GLOBAL_LOADING_TEST_DELAY_MS = 3500;

  const globalLoadingState = {
    activeCount: 0,
    timer: null,
    root: null
  };

  function ensureToastRoot() {
    let root = document.getElementById('toast-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'toast-root';
      root.className = 'toast-root';
      document.body.appendChild(root);
    }
    return root;
  }

  function ensureLoadingRoot() {
    if (globalLoadingState.root && document.body.contains(globalLoadingState.root)) {
      return globalLoadingState.root;
    }

    let root = document.getElementById('global-loading-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'global-loading-root';
      root.className = 'global-loading-root';
      root.innerHTML = `
        <div class="global-loading-overlay" role="status" aria-live="polite" aria-busy="true">
          <div class="global-loading-panel">
            <div class="lds-spinner global-loading-spinner"><div></div><div></div><div></div><div></div></div>
            <p class="global-loading-text">Loading...</p>
          </div>
        </div>
      `;
      document.body.appendChild(root);
    }

    globalLoadingState.root = root;
    return root;
  }

  function showGlobalLoading(message = 'Loading...') {
    const root = ensureLoadingRoot();
    const overlay = root.querySelector('.global-loading-overlay');
    const text = root.querySelector('.global-loading-text');

    if (text) {
      text.textContent = message;
    }

    if (overlay) {
      if (globalLoadingState.timer) {
        window.clearTimeout(globalLoadingState.timer);
      }

      globalLoadingState.timer = window.setTimeout(() => {
        globalLoadingState.timer = null;
        if (globalLoadingState.activeCount > 0) {
          overlay.classList.add('is-visible');
        }
      }, GLOBAL_LOADING_TEST_DELAY_MS);
    }
  }

  function hideGlobalLoading() {
    if (globalLoadingState.timer) {
      window.clearTimeout(globalLoadingState.timer);
      globalLoadingState.timer = null;
    }

    if (!globalLoadingState.root) {
      return;
    }

    const overlay = globalLoadingState.root.querySelector('.global-loading-overlay');
    if (overlay) {
      overlay.classList.remove('is-visible');
    }
  }

  function beginGlobalLoading(message) {
    globalLoadingState.activeCount += 1;
    showGlobalLoading(message);
  }

  function endGlobalLoading() {
    globalLoadingState.activeCount = Math.max(0, globalLoadingState.activeCount - 1);

    if (globalLoadingState.activeCount === 0) {
      hideGlobalLoading();
    }
  }

  function showToast(message, type = 'info') {
    const root = ensureToastRoot();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    root.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 180);
    }, 4200);
  }

  function ensureModalRoot() {
    let root = document.getElementById('modal-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'modal-root';
      document.body.appendChild(root);
    }
    return root;
  }

  function closeModal(overlay) {
    overlay.remove();
  }

  function setDialogMessage(body, message, messageHtml) {
    if (typeof messageHtml === 'string') {
      body.innerHTML = messageHtml;
      return;
    }

    body.textContent = message;
  }

  function confirmDialog({ title, message, messageHtml, confirmText = 'Confirm', cancelText = 'Cancel', danger = false }) {
    return new Promise(resolve => {
      const root = ensureModalRoot();
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';

      const modal = document.createElement('section');
      modal.className = 'modal-panel';

      const heading = document.createElement('h2');
      heading.textContent = title;
      const body = document.createElement('p');
      setDialogMessage(body, message, messageHtml);

      const actions = document.createElement('div');
      actions.className = 'modal-actions';

      const cancelButton = document.createElement('button');
      cancelButton.className = 'nav-button';
      cancelButton.textContent = cancelText;
      cancelButton.addEventListener('click', () => {
        closeModal(overlay);
        resolve(false);
      });

      const confirmButton = document.createElement('button');
      confirmButton.className = danger ? 'danger-button' : '';
      confirmButton.textContent = confirmText;
      confirmButton.addEventListener('click', () => {
        closeModal(overlay);
        resolve(true);
      });

      actions.appendChild(cancelButton);
      actions.appendChild(confirmButton);
      modal.appendChild(heading);
      modal.appendChild(body);
      modal.appendChild(actions);
      overlay.appendChild(modal);
      root.appendChild(overlay);
      confirmButton.focus();
    });
  }

  function promptDialog({ title, message, messageHtml, placeholder = '', confirmText = 'Confirm', cancelText = 'Cancel', danger = false }) {
    return new Promise(resolve => {
      const root = ensureModalRoot();
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';

      const modal = document.createElement('section');
      modal.className = 'modal-panel';

      const heading = document.createElement('h2');
      heading.textContent = title;
      const body = document.createElement('p');
      setDialogMessage(body, message, messageHtml);

      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = placeholder;

      const actions = document.createElement('div');
      actions.className = 'modal-actions';

      const cancelButton = document.createElement('button');
      cancelButton.className = 'nav-button';
      cancelButton.textContent = cancelText;
      cancelButton.addEventListener('click', () => {
        closeModal(overlay);
        resolve(null);
      });

      const confirmButton = document.createElement('button');
      confirmButton.className = danger ? 'danger-button' : '';
      confirmButton.textContent = confirmText;
      confirmButton.addEventListener('click', () => {
        const value = input.value.trim();
        closeModal(overlay);
        resolve(value || null);
      });

      input.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
          confirmButton.click();
        }
      });

      actions.appendChild(cancelButton);
      actions.appendChild(confirmButton);
      modal.appendChild(heading);
      modal.appendChild(body);
      modal.appendChild(input);
      modal.appendChild(actions);
      overlay.appendChild(modal);
      root.appendChild(overlay);
      input.focus();
    });
  }

  window.showToast = showToast;
  window.confirmDialog = confirmDialog;
  window.promptDialog = promptDialog;
  window.showGlobalLoading = showGlobalLoading;
  window.hideGlobalLoading = hideGlobalLoading;
  window.withGlobalLoading = function (callback, message) {
    beginGlobalLoading(message);
    try {
      const result = Promise.resolve(callback());
      return new Promise((resolve, reject) => {
        window.setTimeout(() => {
          result.then(resolve).catch(reject).finally(endGlobalLoading);
        }, GLOBAL_LOADING_TEST_DELAY_MS);
      });
    } catch (error) {
      endGlobalLoading();
      throw error;
    }
  };
  window.handleAuthExpired = function () {
    if (window.__authExpiredRedirecting) {
      return;
    }
    window.__authExpiredRedirecting = true;
    showToast('Your session expired. Please log in again.', 'warning');
    setTimeout(() => {
      window.location.href = '/login?message=loggedOut';
    }, 900);
  };
})();
