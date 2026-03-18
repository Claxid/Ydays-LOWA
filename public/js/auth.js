/**
 * LOWA - Authentication Module
 * Gestion de l'authentification
 */
let currentUser = null;
let sessionToken = null;

function mapSupabaseUserToProfile(user) {
  const metadata = (user && user.user_metadata) ? user.user_metadata : {};
  return {
    id: user && user.id ? user.id : null,
    email: user && user.email ? user.email : '',
    nom: metadata.nom || '',
    prenom: metadata.prenom || '',
    sexe: metadata.sexe || ''
  };
}

async function savePublicProfileRecord(supabaseClient, profile) {
  if (!supabaseClient || !profile || !profile.email) return;

  const payload = {
    email: profile.email,
    prenom: profile.prenom || null,
    nom: profile.nom || null,
    sexe: profile.sexe || null
  };

  try {
    const { error } = await supabaseClient
      .from('users')
      .upsert(payload, { onConflict: 'email' });
    if (error) {
      const isDuplicate = /duplicate key|unique constraint/i.test(error.message || '');
      if (!isDuplicate) {
        console.warn('Sync profil users non critique:', error.message || error);
      }
    }
  } catch (e) {
    console.warn('Sync profil users non critique:', e && e.message ? e.message : e);
  }
}

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
  if (!stored) return;

  try {
    const session = JSON.parse(stored);
    sessionToken = session.token || null;
    currentUser = session.user || null;
    updateUserUI();
  } catch (e) {
    localStorage.removeItem(LOWA.STORAGE.SESSION_KEY);
  }
}

/**
 * Sauvegarder la session
 */
function saveSession(token, user) {
  sessionToken = token;
  currentUser = user;
  localStorage.setItem(LOWA.STORAGE.SESSION_KEY, JSON.stringify({ token, user }));
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
    const fullName = [currentUser.prenom, currentUser.nom].filter(Boolean).join(' ').trim();
    if (userDisplay) userDisplay.textContent = fullName || currentUser.email || 'Mon compte';
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
      } else if (userMenu) {
        const isHidden = userMenu.getAttribute('aria-hidden') === 'true';
        userMenu.setAttribute('aria-hidden', String(!isHidden));
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
      submitBtn.textContent = 'Connexion...';

      const supabaseClient = initSupabase();
      if (!supabaseClient) throw new Error('Supabase non initialise');

      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data || !data.session || !data.user) {
        throw new Error('Session invalide. Verifiez la confirmation email.');
      }

      const profile = mapSupabaseUserToProfile(data.user);
      saveSession(data.session.access_token, profile);
      closeAllModals();
      loginForm.reset();
    } catch (err) {
      console.error('Erreur connexion:', err);
      alert('Erreur de connexion: ' + (err && err.message ? err.message : 'Inconnue'));
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Se connecter';
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
      submitBtn.textContent = 'Inscription...';

      const supabaseClient = initSupabase();
      if (!supabaseClient) throw new Error('Supabase non initialise');

      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: { nom, prenom, sexe }
        }
      });

      if (error) throw error;

      if (data && data.session && data.user) {
        const profile = mapSupabaseUserToProfile(data.user);
        await savePublicProfileRecord(supabaseClient, profile);
        saveSession(data.session.access_token, profile);
        closeAllModals();
        registerForm.reset();
        alert('Inscription reussie.');
      } else {
        if (data && data.user) {
          const profile = mapSupabaseUserToProfile(data.user);
          await savePublicProfileRecord(supabaseClient, profile);
        }
        closeAllModals();
        registerForm.reset();
        alert('Compte cree. Verifie ton email pour confirmer, puis connecte-toi.');
      }
    } catch (err) {
      console.error('Erreur inscription:', err);
      alert('Erreur inscription: ' + (err && err.message ? err.message : 'Inconnue'));
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'S\'inscrire';
    }
  });
}

/**
 * Configurer la deconnexion
 */
function setupLogout() {
  const logoutBtn = document.getElementById('logout-btn');
  if (!logoutBtn) return;

  logoutBtn.addEventListener('click', async () => {
    try {
      const supabaseClient = initSupabase();
      if (supabaseClient) {
        await supabaseClient.auth.signOut();
      }
    } catch (e) {
      console.error('Erreur deconnexion:', e);
    }

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
