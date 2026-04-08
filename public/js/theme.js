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

    if (typeof state.theme_auto === 'boolean') {
      if (typeof scopedStorageSet === 'function') scopedStorageSet('lowa_pref_theme_auto', String(state.theme_auto));
    }

    await refreshThemeFromSources();
  } catch (e) {
    console.warn('Hydrate theme warning:', e && e.message ? e.message : e);
  }
}

function isFestiveTheme(theme) {
  return ['noel'].includes(String(theme || '').toLowerCase());
}

function getAutoThemeByTime(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 20 || hour < 6) return 'dark';
  if ((hour >= 6 && hour < 10) || (hour >= 17 && hour < 20)) return 'temperate';
  return 'light';
}

async function getGlobalSiteTheme() {
  try {
    if (typeof fetchWithTimeout === 'function') {
      const response = await fetchWithTimeout('/api/admin/settings/default-theme', 3500);
      if (!response || !response.ok) return 'light';
      const data = await response.json();
      return data && data.theme ? String(data.theme) : 'light';
    }
    const response = await fetch('/api/admin/settings/default-theme', { cache: 'no-cache' });
    if (!response.ok) return 'light';
    const data = await response.json();
    return data && data.theme ? String(data.theme) : 'light';
  } catch (e) {
    return 'light';
  }
}

async function refreshThemeFromSources() {
  const globalTheme = await getGlobalSiteTheme();
  const userState = await lowaReadUserState();
  const storedAuto = (typeof scopedStorageGet === 'function' ? scopedStorageGet('lowa_pref_theme_auto') : localStorage.getItem('lowa_pref_theme_auto'));
  const autoEnabled = userState && typeof userState.theme_auto === 'boolean' ? userState.theme_auto : storedAuto !== 'false';
  const activeTheme = isFestiveTheme(globalTheme) ? globalTheme : (autoEnabled ? getAutoThemeByTime() : globalTheme || 'light');
  document.documentElement.setAttribute('data-theme', activeTheme);
  syncThemeToggleUI(autoEnabled, globalTheme, activeTheme);
}

function syncThemeToggleUI(autoEnabled, globalTheme, activeTheme) {
  const themeToggle = document.getElementById('theme-toggle');
  if (!themeToggle) return;
  themeToggle.textContent = autoEnabled ? 'Auto: ON' : 'Auto: OFF';
  themeToggle.title = isFestiveTheme(globalTheme)
    ? `Thème global admin: ${globalTheme}`
    : `Thème actif: ${activeTheme}`;
}

/**
 * Définir le thème
 */
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
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

  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const storedAuto = (typeof scopedStorageGet === 'function' ? scopedStorageGet('lowa_pref_theme_auto') : localStorage.getItem('lowa_pref_theme_auto'));
    const autoEnabled = storedAuto !== 'false';
    const nextAuto = !autoEnabled;

    if (typeof scopedStorageSet === 'function') {
      scopedStorageSet('lowa_pref_theme_auto', String(nextAuto));
    } else {
      localStorage.setItem('lowa_pref_theme_auto', String(nextAuto));
    }

    lowaWriteUserStatePatch({ theme_auto: nextAuto }).catch(() => {});
    syncThemeToggleUI(nextAuto, current, current);
    refreshThemeFromSources();
  });

  const initialAuto = (typeof scopedStorageGet === 'function' ? scopedStorageGet('lowa_pref_theme_auto') : localStorage.getItem('lowa_pref_theme_auto'));
  themeToggle.textContent = initialAuto === 'false' ? 'Auto: OFF' : 'Auto: ON';
}

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
});
