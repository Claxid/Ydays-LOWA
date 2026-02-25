/**
 * LOWA - Modal Module
 * Gestion des modales
 */

/**
 * Ouvrir une modal
 */
function openModal(modalId) {
  closeAllModals();
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.setAttribute('aria-hidden', 'false');
    modal.querySelector('input')?.focus();
  }
}

/**
 * Fermer toutes les modales
 */
function closeAllModals() {
  document.querySelectorAll('.modal').forEach(m => {
    m.setAttribute('aria-hidden', 'true');
  });
}

/**
 * Initialiser les modales
 */
function initModals() {
  // Modal close buttons
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
  });
  
  // Modal overlays
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', closeAllModals);
  });
  
  // Button handlers
  const openLoginBtn = document.getElementById('open-login-btn');
  const openRegisterBtn = document.getElementById('open-register-btn');
  const switchToRegister = document.getElementById('switch-to-register');
  const switchToLogin = document.getElementById('switch-to-login');
  
  if (openLoginBtn) {
    openLoginBtn.addEventListener('click', () => openModal('login-modal'));
  }
  if (openRegisterBtn) {
    openRegisterBtn.addEventListener('click', () => openModal('register-modal'));
  }
  if (switchToRegister) {
    switchToRegister.addEventListener('click', (e) => {
      e.preventDefault();
      openModal('register-modal');
    });
  }
  if (switchToLogin) {
    switchToLogin.addEventListener('click', (e) => {
      e.preventDefault();
      openModal('login-modal');
    });
  }
}

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', () => {
  initModals();
});
