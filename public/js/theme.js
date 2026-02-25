/**
 * LOWA - Theme Module
 * Gestion des thèmes
 */

/**
 * Initialiser le thème
 */
function initTheme() {
  const fontSize = localStorage.getItem('lowa_pref_font_size') || 'normal';
  const spacing = localStorage.getItem('lowa_pref_spacing') || 'normal';
  const animations = localStorage.getItem('lowa_pref_animations') !== 'false';
  
  setTheme('light');
  applyFontSize(fontSize);
  applySpacing(spacing);
  applyAnimations(animations);
  initThemeToggle();
}

/**
 * Définir le thème
 */
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(LOWA.STORAGE.THEME_KEY, theme);
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
