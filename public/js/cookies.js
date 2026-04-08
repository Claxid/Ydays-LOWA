/**
 * LOWA - Cookies Module
 * Gestion du consentement aux cookies
 */

/**
 * Initialiser le consentement aux cookies
 */
function initCookieBanner() {
  const banner = document.getElementById('cookie-banner');
  const acceptBtn = document.getElementById('cookie-accept');
  const declineBtn = document.getElementById('cookie-decline');
  const policyLink = document.getElementById('cookie-policy');
  
  if (!banner || !acceptBtn || !declineBtn) return;

  const cookieGet = () => {
    if (typeof lowaReadUserState === 'function') {
      return null;
    }
    if (typeof scopedStorageGet === 'function') {
      return scopedStorageGet(LOWA.STORAGE.COOKIE_CONSENT_KEY);
    }
    return localStorage.getItem(LOWA.STORAGE.COOKIE_CONSENT_KEY);
  };

  const cookieSet = async (value) => {
    if (typeof lowaWriteUserStatePatch === 'function') {
      const status = value === 'accepted' ? 'accepted' : 'declined';
      const ok = await lowaWriteUserStatePatch({ cookie_consent: status });
      if (ok) return true;
    }
    if (typeof scopedStorageSet === 'function') {
      scopedStorageSet(LOWA.STORAGE.COOKIE_CONSENT_KEY, value);
      return true;
    }
    localStorage.setItem(LOWA.STORAGE.COOKIE_CONSENT_KEY, value);
    return true;
  };
  
  function checkExistingConsent() {
    const consent = cookieGet();
    if (!consent) {
      setTimeout(() => banner.classList.add('show'), 500);
    }
  }
  
  acceptBtn.addEventListener('click', () => {
    const consentData = JSON.stringify({
      status: 'accepted',
      date: new Date().toISOString(),
      user_id: currentUser ? currentUser.id : null,
      user_email: currentUser ? currentUser.email : null
    });
    Promise.resolve(cookieSet(consentData)).finally(() => {
      banner.classList.remove('show');
      console.log('Cookies accepted');
    });
  });
  
  declineBtn.addEventListener('click', () => {
    const consentData = JSON.stringify({
      status: 'declined',
      date: new Date().toISOString(),
      user_id: currentUser ? currentUser.id : null,
      user_email: currentUser ? currentUser.email : null
    });
    Promise.resolve(cookieSet(consentData)).finally(() => {
      banner.classList.remove('show');
      console.log('Cookies declined');
    });
  });
  
  if (policyLink) {
    policyLink.addEventListener('click', (e) => {
      e.preventDefault();
      alert('Politique de cookies:\n\nNous utilisons des cookies pour:\n- Améliorer votre expérience utilisateur\n- Mémoriser votre panier\n- Analyser l\'usage du site\n- Personnaliser vos préférences\n\nLes cookies essentiels sont toujours activés.\n\nPour les utilisateurs connectés:\n- Vos préférences de cookies sont sauvegardées dans votre compte\n- Votre historique d\'achat est stocké de manière sécurisée\n- Votre panier se synchronise automatiquement');
    });
  }
  
  checkExistingConsent();
}

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', () => {
  initCookieBanner();
});
