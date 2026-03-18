/**
 * LOWA - Common Utilities
 * Fonctions et utilitaires partagés
 */

const LOWA = {
  SUPABASE: {
    URL: 'https://feslvznzutoygnnsztoy.supabase.co',
    ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlc2x2em56dXRveWdubnN6dG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMTI3NzYsImV4cCI6MjA4NzU4ODc3Nn0.6krv4Cuge49e7tTggfql0My22DS_DpnNx5Dgg3utBxA',
    client: null
  },
  API: {
    BASE: 'https://lowa-api.onrender.com/api', // Ancien - sera supprimé après migration
    LOCAL_USERS_KEY: 'lowa_local_users'
  },
  STORAGE: {
    FAVORITES_KEY: 'lowa_favorites',
    THEME_KEY: 'lowa_theme',
    SESSION_KEY: 'lowa_session',
    FILTER_KEY: 'lowa_filters',
    CACHE_KEY: 'lowa_products_cache',
    CACHE_TIME_KEY: 'lowa_products_cache_time',
    CACHE_VERSION_KEY: 'lowa_products_cache_version',
    CACHE_VERSION: 'v16', // Bumped for Supabase
    COOKIE_CONSENT_KEY: 'lowa_cookie_consent'
  },
  PAGINATION: {
    PRODUCTS_PER_PAGE: 12
  }
};

function sanitizeStorageSegment(value) {
  return String(value || 'guest')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .slice(0, 80);
}

function getActiveStorageUserId() {
  try {
    const raw = localStorage.getItem(LOWA.STORAGE.SESSION_KEY);
    if (!raw) return 'guest';
    const session = JSON.parse(raw);
    const user = session && session.user ? session.user : null;
    const idOrEmail = (user && (user.id || user.email)) || 'guest';
    return sanitizeStorageSegment(idOrEmail);
  } catch (e) {
    return 'guest';
  }
}

function getScopedStorageKey(baseKey, scope = 'user') {
  if (scope === 'global') return baseKey;
  return `${baseKey}__${getActiveStorageUserId()}`;
}

function scopedStorageGet(baseKey, options = {}) {
  const scope = options.scope || 'user';
  const migrateLegacy = options.migrateLegacy !== false;
  const scopedKey = getScopedStorageKey(baseKey, scope);
  const scopedValue = localStorage.getItem(scopedKey);

  if (scopedValue !== null) return scopedValue;

  if (migrateLegacy) {
    const legacyValue = localStorage.getItem(baseKey);
    if (legacyValue !== null) {
      localStorage.setItem(scopedKey, legacyValue);
      return legacyValue;
    }
  }

  return null;
}

function scopedStorageSet(baseKey, value, options = {}) {
  const scope = options.scope || 'user';
  const scopedKey = getScopedStorageKey(baseKey, scope);
  localStorage.setItem(scopedKey, value);
}

/**
 * Initialiser le client Supabase
 */
function initSupabase() {
  // Check if Supabase library is loaded
  const supabaseLib = window.supabase;
  
  if (!supabaseLib || typeof supabaseLib.createClient !== 'function') {
    console.error('❌ Supabase library not loaded. Check CDN link.');
    return null;
  }
  
  if (!LOWA.SUPABASE.client) {
    try {
      LOWA.SUPABASE.client = supabaseLib.createClient(
        LOWA.SUPABASE.URL,
        LOWA.SUPABASE.ANON_KEY
      );
      console.log('✅ Supabase client initialized');
    } catch (err) {
      console.error('❌ Supabase initialization error:', err);
      return null;
    }
  }
  return LOWA.SUPABASE.client;
}

/**
 * Format un prix numérique
 */
function formatPrice(value) {
  const n = typeof value === 'number' ? value : parseFloat(value);
  return isFinite(n) ? n.toFixed(2) : '0.00';
}

/**
 * Fallback pour images manquantes
 */
window.lowaImgFallback = function(img) {
  try {
    const src = img.getAttribute('src') || '';
    if (src.includes('/images/')) {
      img.src = src.replace('/images/', '/public/images/');
    } else if (src.includes('/public/images/')) {
      img.src = src.replace('/public/images/', '/images/');
    } else {
      img.src = '/public/images/pull-gris.svg';
    }
    img.onerror = null;
  } catch (e) {
    img.src = '/public/images/pull-gris.svg';
    img.onerror = null;
  }
};

/**
 * Fetch avec timeout
 */
async function fetchWithTimeout(url, ms = 3000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { cache: 'no-cache', signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fusion de deux listes de produits (déduplication)
 */
function mergeProducts(baseList, extraList) {
  const seen = new Set();
  const result = [];
  const key = (p) => (p.id != null ? `id:${p.id}` : `name:${(p.name||'').toLowerCase()}`);
  for (const p of baseList || []) {
    const k = key(p);
    if (!seen.has(k)) { seen.add(k); result.push(p); }
  }
  for (const p of extraList || []) {
    const k = key(p);
    if (!seen.has(k)) { seen.add(k); result.push(p); }
  }
  return result;
}

/**
 * Afficher le squelette de chargement
 */
function showSkeleton(count = 6) {
  const productsGrid = document.getElementById('products');
  if (!productsGrid) return;
  const skeletonCard = `
    <article class="product skeleton" aria-hidden="true">
      <div class="product-image-container shimmer"></div>
      <div class="skeleton-line" style="width:70%"></div>
      <div class="skeleton-line" style="width:90%"></div>
      <div class="meta">
        <span class="skeleton-pill"></span>
        <span class="skeleton-btn"></span>
      </div>
    </article>`;
  productsGrid.innerHTML = Array.from({ length: count }).map(() => skeletonCard).join('');
}

/**
 * Afficher l'année dans le footer
 */
document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
});
