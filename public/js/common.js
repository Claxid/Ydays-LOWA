/**
 * LOWA - Common Utilities
 * Fonctions et utilitaires partagés
 */

const LOWA = {
  API: {
    BASE: 'https://lowa-api.onrender.com/api',
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
    CACHE_VERSION: 'v15',
    COOKIE_CONSENT_KEY: 'lowa_cookie_consent'
  },
  PAGINATION: {
    PRODUCTS_PER_PAGE: 12
  }
};

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
