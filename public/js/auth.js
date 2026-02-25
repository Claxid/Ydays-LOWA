/**
 * LOWA - Authentication Module
 * Gestion de l'authentification
 */

let currentUser = null;
let sessionToken = null;

/**
 * Vérifier l'authentification et afficher modal si nécessaire
 */
function requireAuth(reason) {
  if (currentUser) return true;
  if (reason) {
    alert(reason);
  }
  openModal('login-modal');
  return false;
}

/**
 * Charger la session depuis le stockage
 */
function loadSessionFromStorage() {
  const stored = localStorage.getItem(LOWA.STORAGE.SESSION_KEY);
  if (stored) {
    try {
      const session = JSON.parse(stored);
      sessionToken = session.token;
      currentUser = session.user;
      updateUserUI();
    } catch (e) {
      localStorage.removeItem(LOWA.STORAGE.SESSION_KEY);
    }
  }
}

/**
 * Sauvegarder la session
 */
function saveSession(token, user) {
  sessionToken = token;
  currentUser = user;
  localStorage.setItem(LOWA.STORAGE.SESSION_KEY, JSON.stringify({token, user}));
  updateUserUI();
}

/**
 * Effacer la session
 */
function clearSession() {
  sessionToken = null;
  currentUser = null;
  localStorage.removeItem(LOWA.STORAGE.SESSION_KEY);
  updateUserUI();
}

/**
 * Mettre à jour l'interface utilisateur
 */
function updateUserUI() {
  const userDisplay = document.getElementById('user-display');
  const openLoginBtn = document.getElementById('open-login-btn');
  const openRegisterBtn = document.getElementById('open-register-btn');
  const userInfoBtn = document.getElementById('user-info-btn');
  const logoutBtn = document.getElementById('logout-btn');
  
  if (currentUser) {
    if (userDisplay) userDisplay.textContent = currentUser.prenom + ' ' + currentUser.nom;
    if (openLoginBtn) openLoginBtn.style.display = 'none';
    if (openRegisterBtn) openRegisterBtn.style.display = 'none';
    if (userInfoBtn) userInfoBtn.style.display = 'block';
    if (logoutBtn) logoutBtn.style.display = 'block';
  } else {
    if (userDisplay) userDisplay.textContent = 'Connexion';
    if (openLoginBtn) openLoginBtn.style.display = 'block';
    if (openRegisterBtn) openRegisterBtn.style.display = 'block';
    if (userInfoBtn) userInfoBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';
  }
}

/**
 * Initialiser l'authentification
 */
function initAuth() {
  loadSessionFromStorage();
  setupUserMenu();
  setupLoginForm();
  setupRegisterForm();
  setupLogout();
  handleAuthRedirect();
}

/**
 * Configurer le menu utilisateur
 */
function setupUserMenu() {
  const userMenuBtn = document.getElementById('user-menu-btn');
  const userMenu = document.getElementById('user-menu');
  const userInfoBtn = document.getElementById('user-info-btn');
  
  if (userMenuBtn) {
    userMenuBtn.addEventListener('click', (e) => {
      if (!currentUser) {
        openModal('login-modal');
      } else {
        const isHidden = userMenu.getAttribute('aria-hidden') === 'true';
        userMenu.setAttribute('aria-hidden', !isHidden);
      }
      e.stopPropagation();
    });
  }
  
  document.addEventListener('click', (e) => {
    if (userMenu && !e.target.closest('.user-btn') && !e.target.closest('.user-menu')) {
      userMenu.setAttribute('aria-hidden', 'true');
    }
  });
  
  if (userInfoBtn) {
    userInfoBtn.addEventListener('click', () => {
      window.location.href = '/public/pages/profile.html';
    });
  }
}

/**
 * Configurer le formulaire de connexion
 */
function setupLoginForm() {
  const loginForm = document.getElementById('login-form');
  if (!loginForm) return;
  
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    try {
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Connexion...';
      
      const response = await fetch(LOWA.API.BASE + '/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email, password})
      });
      
      if (!response.ok) throw new Error('Login failed');
      const data = await response.json();
      saveSession(data.token, data.user);
      closeAllModals();
      loginForm.reset();
      submitBtn.textContent = 'Se connecter';
    } catch (err) {
      const localUsers = JSON.parse(localStorage.getItem(LOWA.API.LOCAL_USERS_KEY) || '[]');
      const matched = localUsers.find(u => u.email === email && u.password === password);
      if (matched) {
        const token = 'local-' + Date.now();
        saveSession(token, matched);
        closeAllModals();
        loginForm.reset();
        alert('Connexion réussie (mode local, API indisponible)');
        submitBtn.textContent = 'Se connecter';
      } else {
        alert('Erreur de connexion: serveur indisponible et aucun compte local correspondant');
        submitBtn.textContent = 'Se connecter';
      }
    } finally {
      submitBtn.disabled = false;
    }
  });
}

/**
 * Configurer le formulaire d'inscription
 */
function setupRegisterForm() {
  const registerForm = document.getElementById('register-form');
  if (!registerForm) return;
  
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('register-email').value;
    const nom = document.getElementById('register-nom').value;
    const prenom = document.getElementById('register-prenom').value;
    const sexe = document.getElementById('register-sexe').value;
    const password = document.getElementById('register-password').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    try {
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Inscription...';
      
      const response = await fetch(LOWA.API.BASE + '/register', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email, nom, prenom, sexe, password})
      });
      
      if (!response.ok) throw new Error('Registration failed');
      const data = await response.json();
      saveSession(data.token, {id: data.user_id, email, nom, prenom, sexe});
      closeAllModals();
      registerForm.reset();
      submitBtn.textContent = 'S\'inscrire';
    } catch (err) {
      const localUsers = JSON.parse(localStorage.getItem(LOWA.API.LOCAL_USERS_KEY) || '[]');
      const already = localUsers.find(u => u.email === email);
      if (already) {
        alert('Compte local déjà existant. Essayez de vous connecter.');
      } else {
        const newUser = { id: 'local-' + Date.now(), email, nom, prenom, sexe, password };
        localUsers.push(newUser);
        localStorage.setItem(LOWA.API.LOCAL_USERS_KEY, JSON.stringify(localUsers));
        const token = 'local-' + Date.now();
        saveSession(token, newUser);
        closeAllModals();
        registerForm.reset();
        alert('Inscription réussie en mode local (API indisponible)');
      }
      submitBtn.textContent = 'S\'inscrire';
    } finally {
      submitBtn.disabled = false;
    }
  });
}

/**
 * Configurer la déconnexion
 */
function setupLogout() {
  const logoutBtn = document.getElementById('logout-btn');
  if (!logoutBtn) return;
  
  logoutBtn.addEventListener('click', async () => {
    try {
      await fetch(LOWA.API.BASE + '/logout', {
        method: 'POST',
        headers: {Authorization: sessionToken}
      });
    } catch (e) {}
    clearSession();
    const userMenu = document.getElementById('user-menu');
    if (userMenu) {
      userMenu.setAttribute('aria-hidden', 'true');
    }
  });
}

/**
 * Gérer la redirection d'authentification
 */
function handleAuthRedirect() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('auth') === 'login' && !currentUser) {
    openModal('login-modal');
  }
}

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
});
