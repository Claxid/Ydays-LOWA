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
    if (typeof scopedStorageGet === 'function') {
      return scopedStorageGet(LOWA.STORAGE.COOKIE_CONSENT_KEY);
    }
    return localStorage.getItem(LOWA.STORAGE.COOKIE_CONSENT_KEY);
  };

  const cookieSet = (value) => {
    if (typeof scopedStorageSet === 'function') {
      scopedStorageSet(LOWA.STORAGE.COOKIE_CONSENT_KEY, value);
      return;
    }
    localStorage.setItem(LOWA.STORAGE.COOKIE_CONSENT_KEY, value);
  };
  
  function checkExistingConsent() {
    const consent = cookieGet();
    if (!consent) {
      setTimeout(() => banner.classList.add('show'), 500);
    }
  }
  
  acceptBtn.addEventListener('click', () => {
    const consentData = {
      status: 'accepted',
      date: new Date().toISOString(),
      user_id: currentUser ? currentUser.id : null,
      user_email: currentUser ? currentUser.email : null
    };
    cookieSet(JSON.stringify(consentData));
    banner.classList.remove('show');
    
    if (currentUser && sessionToken) {
      fetch(LOWA.API.BASE + '/user-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': sessionToken
        },
        body: JSON.stringify({cookie_consent: 'accepted'})
      }).catch(e => console.log('Preference sync error:', e));
    }
    console.log('Cookies accepted');
  });
  
  declineBtn.addEventListener('click', () => {
    const consentData = {
      status: 'declined',
      date: new Date().toISOString(),
      user_id: currentUser ? currentUser.id : null,
      user_email: currentUser ? currentUser.email : null
    };
    cookieSet(JSON.stringify(consentData));
    banner.classList.remove('show');
    console.log('Cookies declined');
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
