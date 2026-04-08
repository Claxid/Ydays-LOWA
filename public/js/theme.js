/**
 * LOWA - Theme Module
 * Gestion des thèmes
 */

/**
 * Initialiser le thème
 */
function initTheme() {
  const fontSize = (typeof scopedStorageGet === 'function' ? scopedStorageGet('lowa_pref_font_size') : localStorage.getItem('lowa_pref_font_size')) || 'normal';
  const spacing = (typeof scopedStorageGet === 'function' ? scopedStorageGet('lowa_pref_spacing') : localStorage.getItem('lowa_pref_spacing')) || 'normal';
  const animationsRaw = (typeof scopedStorageGet === 'function' ? scopedStorageGet('lowa_pref_animations') : localStorage.getItem('lowa_pref_animations'));
  const animations = animationsRaw !== 'false';

  const savedTheme = (typeof scopedStorageGet === 'function' ? scopedStorageGet(LOWA.STORAGE.THEME_KEY) : localStorage.getItem(LOWA.STORAGE.THEME_KEY)) || 'light';
  setTheme(savedTheme);
  applyFontSize(fontSize);
  applySpacing(spacing);
  applyAnimations(animations);
  initThemeToggle();
  hydrateThemeFromCloud();
}

async function hydrateThemeFromCloud() {
  try {
    const state = await lowaReadUserState();
    if (!state) return;

    if (state.theme) {
      setTheme(state.theme);
    }

    if (state.font_size) {
      applyFontSize(state.font_size);
      if (typeof scopedStorageSet === 'function') scopedStorageSet('lowa_pref_font_size', state.font_size);
    }

    if (state.spacing) {
      applySpacing(state.spacing);
      if (typeof scopedStorageSet === 'function') scopedStorageSet('lowa_pref_spacing', state.spacing);
    }

    if (typeof state.animations === 'boolean') {
      applyAnimations(state.animations);
      if (typeof scopedStorageSet === 'function') scopedStorageSet('lowa_pref_animations', String(state.animations));
    }
  } catch (e) {
    console.warn('Hydrate theme warning:', e && e.message ? e.message : e);
  }
}

/**
 * Définir le thème
 */
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  if (typeof scopedStorageSet === 'function') {
    scopedStorageSet(LOWA.STORAGE.THEME_KEY, theme);
  } else {
    localStorage.setItem(LOWA.STORAGE.THEME_KEY, theme);
  }

  lowaWriteUserStatePatch({ theme: theme }).catch(() => {});
}

/**
 * Appliquer la taille de police
 */
function applyFontSize(size) {
  const sizes = { small: '90%', normal: '100%', large: '110%', xlarge: '120%' };
  document.documentElement.style.setProperty('--font-scale', sizes[size] || '100%');
}

/**
 * Appliquer l'espacement
 */
function applySpacing(spacing) {
  const spacings = { compact: '0.5', normal: '1', comfortable: '1.5' };
  const scale = spacings[spacing] || '1';
  document.documentElement.style.setProperty('--spacing-scale', scale);
}

/**
 * Appliquer les animations
 */
function applyAnimations(enabled) {
  const animations = enabled !== false;
  if (!animations) {
    document.documentElement.style.setProperty('--transition-fast', '0s');
    document.documentElement.style.setProperty('--transition-medium', '0s');
  } else {
    document.documentElement.style.removeProperty('--transition-fast');
    document.documentElement.style.removeProperty('--transition-medium');
  }
}

/**
 * Initialiser le bouton de changement de thème
 */
function initThemeToggle() {
  const themeToggle = document.getElementById('theme-toggle');
  if (!themeToggle) return;
  
  const updateThemeEmoji = () => {
    const theme = document.documentElement.getAttribute('data-theme');
    if (theme === 'dark') {
      themeToggle.textContent = '🌙';
    } else if (theme === 'temperate') {
      themeToggle.textContent = '🍂';
    } else if (theme === 'noel') {
      themeToggle.textContent = '❄️';
    } else {
      themeToggle.textContent = '☀️';
    }
  };
  
  updateThemeEmoji();
  
  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    let nextTheme = 'light';
    if (currentTheme === 'light') nextTheme = 'dark';
    else if (currentTheme === 'dark') nextTheme = 'temperate';
    else if (currentTheme === 'temperate') nextTheme = 'noel';
    else nextTheme = 'light';
    
    setTheme(nextTheme);
    updateThemeEmoji();
  });
}

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
});
