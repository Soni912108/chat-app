(function () {
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
