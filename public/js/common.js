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
    CACHE_VERSION: 'v24', // Bumped after reducing the product catalog
    COOKIE_CONSENT_KEY: 'lowa_cookie_consent'
  },
  PAGINATION: {
    PRODUCTS_PER_PAGE: 12
  }
};

const LOWA_ADMIN_ENTRY_KEY = 'lowa_admin_entry';
let lowaAdminShortcutState = { step: 0, timer: null, startedAt: 0 };

const LOWA_SCOPED_STORAGE_VERSION = 'v2';
const LOWA_ACTIVE_USER_STORAGE_KEY = 'lowa_active_user_scope';

function sanitizeStorageSegment(value) {
  return String(value || 'guest')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .slice(0, 80);
}

function setActiveStorageUserId(value) {
  const normalized = sanitizeStorageSegment(value);
  if (normalized && normalized !== 'guest') {
    localStorage.setItem(LOWA_ACTIVE_USER_STORAGE_KEY, normalized);
  }
}

function clearActiveStorageUserId() {
  localStorage.removeItem(LOWA_ACTIVE_USER_STORAGE_KEY);
}

function decodeJwtPayload(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4;
    const padded = b64 + (pad ? '='.repeat(4 - pad) : '');
    const json = atob(padded);
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

function getActiveStorageUserId() {
  try {
    const raw = localStorage.getItem(LOWA.STORAGE.SESSION_KEY);
    if (raw) {
      const session = JSON.parse(raw);
      const explicitScope = session && session.storage_scope ? sanitizeStorageSegment(session.storage_scope) : null;
      if (explicitScope && explicitScope !== 'guest') {
        setActiveStorageUserId(explicitScope);
        return explicitScope;
      }

      const user = session && session.user ? session.user : null;
      const jwtPayload = decodeJwtPayload(session && session.token ? session.token : '');
      const idOrEmail =
        (user && (user.id || user.email)) ||
        (jwtPayload && (jwtPayload.sub || jwtPayload.email)) ||
        null;

      if (idOrEmail) {
        setActiveStorageUserId(idOrEmail);
        return sanitizeStorageSegment(idOrEmail);
      }
    }

    const persisted = localStorage.getItem(LOWA_ACTIVE_USER_STORAGE_KEY);
    if (persisted) return sanitizeStorageSegment(persisted);

    return 'guest';
  } catch (e) {
    return 'guest';
  }
}

function getScopedStorageKey(baseKey, scope = 'user') {
  if (scope === 'global') return baseKey;
  return `${baseKey}__${getActiveStorageUserId()}__${LOWA_SCOPED_STORAGE_VERSION}`;
}

function scopedStorageGet(baseKey, options = {}) {
  const scope = options.scope || 'user';
  const migrateLegacy = options.migrateLegacy === true;
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

function isTypingTarget(target) {
  const tag = target && target.tagName ? String(target.tagName).toLowerCase() : '';
  return ['input', 'textarea', 'select'].includes(tag) || (target && target.isContentEditable);
}

function matchesAdminSecondaryKey(event) {
  const key = String(event.key || '').toLowerCase();
  const code = String(event.code || '').toLowerCase();
  return (
    key === 'ù' ||
    key === '%' ||
    key === 'dead' ||
    code === 'quote' ||
    code === 'semicolon' ||
    code === 'bracketright'
  );
}

function openAdminFromShortcut() {
  clearTimeout(lowaAdminShortcutState.timer);
  lowaAdminShortcutState.step = 0;
  lowaAdminShortcutState.startedAt = 0;
  sessionStorage.setItem(LOWA_ADMIN_ENTRY_KEY, '1');
  window.location.href = '/admin.html';
}

function registerAdminKeyboardShortcut() {
  document.addEventListener('keydown', (event) => {
    if (isTypingTarget(event.target)) return;

    const key = String(event.key || '').toLowerCase();

    if (lowaAdminShortcutState.step === 0) {
      if (event.ctrlKey && key === 'm') {
        lowaAdminShortcutState.step = 1;
        lowaAdminShortcutState.startedAt = Date.now();
        clearTimeout(lowaAdminShortcutState.timer);
        lowaAdminShortcutState.timer = setTimeout(() => {
          lowaAdminShortcutState.step = 0;
          lowaAdminShortcutState.startedAt = 0;
        }, 1500);
        event.preventDefault();
      }
      return;
    }

    const inTimeWindow = Date.now() - (lowaAdminShortcutState.startedAt || 0) < 2000;
    if (lowaAdminShortcutState.step === 1 && inTimeWindow && matchesAdminSecondaryKey(event)) {
      openAdminFromShortcut();
      event.preventDefault();
      return;
    }

    if (key !== 'm') {
      clearTimeout(lowaAdminShortcutState.timer);
      lowaAdminShortcutState.step = 0;
      lowaAdminShortcutState.startedAt = 0;
    }
  }, true);
}

registerAdminKeyboardShortcut();

const LOWA_USER_STATE_TABLE = 'user_state';

function lowaNormalizeUserState(row) {
  const state = row || {};
  return {
    favorites: Array.isArray(state.favorites) ? state.favorites : [],
    cart: Array.isArray(state.cart) ? state.cart : [],
    theme: typeof state.theme === 'string' ? state.theme : null,
    font_size: typeof state.font_size === 'string' ? state.font_size : null,
    spacing: typeof state.spacing === 'string' ? state.spacing : null,
    animations: typeof state.animations === 'boolean' ? state.animations : null,
    language: typeof state.language === 'string' ? state.language : null,
    notif: typeof state.notif === 'boolean' ? state.notif : null,
    avatar: typeof state.avatar === 'string' ? state.avatar : null,
    theme_auto: typeof state.theme_auto === 'boolean' ? state.theme_auto : null,
    cookie_consent: typeof state.cookie_consent === 'string' ? state.cookie_consent : null
  };
}

async function lowaGetAuthUser() {
  const supabaseClient = initSupabase();
  if (!supabaseClient) {
    console.error('❌ Cannot get auth user: Supabase client not initialized');
    return null;
  }
  try {
    const { data, error } = await supabaseClient.auth.getUser();
    if (error || !data || !data.user) {
      console.warn('⚠️ No authenticated user:', error ? error.message : 'data.user is null');
      return null;
    }
    console.log('✅ Auth user found:', data.user.email);
    return data.user;
  } catch (e) {
    console.error('❌ Error getting auth user:', e && e.message ? e.message : e);
    return null;
  }
}

async function lowaReadUserState() {
  const supabaseClient = initSupabase();
  if (!supabaseClient) return null;
  const authUser = await lowaGetAuthUser();
  if (!authUser) return null;

  try {
    const { data, error } = await supabaseClient
      .from(LOWA_USER_STATE_TABLE)
      .select('favorites, cart, theme, font_size, spacing, animations, language, notif, avatar, theme_auto, cookie_consent')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (error) {
      console.warn('Read user_state warning:', error.message || error);
      return null;
    }
    return lowaNormalizeUserState(data);
  } catch (e) {
    console.warn('Read user_state warning:', e && e.message ? e.message : e);
    return null;
  }
}

async function lowaWriteUserStatePatch(patch) {
  const supabaseClient = initSupabase();
  if (!supabaseClient) {
    console.error('❌ Supabase client initialization failed');
    return false;
  }
  
  const authUser = await lowaGetAuthUser();
  if (!authUser) {
    console.error('❌ User not authenticated. Cannot sync to user_state.');
    return false;
  }
  
  console.log('📤 Syncing user state for user:', authUser.id);

  const existing = (await lowaReadUserState()) || {};
  const merged = Object.assign({}, lowaNormalizeUserState(existing), patch || {});

  const payload = {
    user_id: authUser.id,
    favorites: Array.isArray(merged.favorites) ? merged.favorites : [],
    cart: Array.isArray(merged.cart) ? merged.cart : [],
    theme: merged.theme || null,
    font_size: merged.font_size || null,
    spacing: merged.spacing || null,
    animations: typeof merged.animations === 'boolean' ? merged.animations : null,
    language: merged.language || null,
    notif: typeof merged.notif === 'boolean' ? merged.notif : null,
    avatar: merged.avatar || null,
    theme_auto: typeof merged.theme_auto === 'boolean' ? merged.theme_auto : null,
    cookie_consent: merged.cookie_consent || null,
    updated_at: new Date().toISOString()
  };

  try {
    console.log('📝 Payload to sync:', payload);
    const { error } = await supabaseClient
      .from(LOWA_USER_STATE_TABLE)
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      console.error('❌ Write user_state error:', error.message || error);
      console.error('Error details:', error);
      return false;
    }
    console.log('✅ User state synced successfully');
    return true;
  } catch (e) {
    console.error('❌ Write user_state exception:', e && e.message ? e.message : e);
    console.error('Exception details:', e);
    return false;
  }
}

async function lowaReadPublicProfile() {
  const supabaseClient = initSupabase();
  if (!supabaseClient) return null;
  const authUser = await lowaGetAuthUser();
  if (!authUser || !authUser.email) return null;

  try {
    const { data, error } = await supabaseClient
      .from('users')
      .select('email, prenom, nom, sexe')
      .eq('email', authUser.email)
      .maybeSingle();

    if (error) {
      console.warn('Read users warning:', error.message || error);
      return null;
    }

    return data || null;
  } catch (e) {
    console.warn('Read users warning:', e && e.message ? e.message : e);
    return null;
  }
}

async function lowaWritePublicProfilePatch(patch) {
  const supabaseClient = initSupabase();
  if (!supabaseClient) return false;
  const authUser = await lowaGetAuthUser();
  if (!authUser || !authUser.email) return false;

  const existing = (await lowaReadPublicProfile()) || {};
  const payload = {
    email: authUser.email,
    prenom: typeof patch?.prenom === 'string' ? patch.prenom : existing.prenom || null,
    nom: typeof patch?.nom === 'string' ? patch.nom : existing.nom || null,
    sexe: typeof patch?.sexe === 'string' ? patch.sexe : existing.sexe || null
  };

  try {
    const { error } = await supabaseClient
      .from('users')
      .upsert(payload, { onConflict: 'email' });

    if (error) {
      console.warn('Write users warning:', error.message || error);
      return false;
    }

    return true;
  } catch (e) {
    console.warn('Write users warning:', e && e.message ? e.message : e);
    return false;
  }
}

window.LOWA_DEBUG_SCOPE = function() {
  const uid = getActiveStorageUserId();
  const sessionRaw = localStorage.getItem(LOWA.STORAGE.SESSION_KEY);
  let sessionInfo = null;
  try {
    const session = sessionRaw ? JSON.parse(sessionRaw) : null;
    sessionInfo = session && session.user ? {
      id: session.user.id || null,
      email: session.user.email || null
    } : null;
  } catch (e) {
    sessionInfo = { error: 'parse-failed' };
  }
  const info = {
    activeScope: uid,
    persistedScope: localStorage.getItem(LOWA_ACTIVE_USER_STORAGE_KEY),
    sessionUser: sessionInfo,
    favoritesKey: getScopedStorageKey(LOWA.STORAGE.FAVORITES_KEY),
    cartKey: getScopedStorageKey('lowa_cart'),
    themeKey: getScopedStorageKey(LOWA.STORAGE.THEME_KEY)
  };
  console.log('LOWA scope debug:', info);
  return info;
};

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
 * Normaliser un chemin d'image pour l'usage dans src/href
 */
function lowaEncodeImagePath(path) {
  const raw = String(path || '');
  try {
    return encodeURI(raw).replace(/'/g, '%27');
  } catch (e) {
    return raw;
  }
}

/**
 * Fallback pour images manquantes
 */
window.lowaImgFallback = function(img) {
  try {
    const src = img.getAttribute('src') || '';
    if (src.includes('/images/')) {
      img.src = lowaEncodeImagePath(src.replace('/images/', '/public/images/'));
    } else if (src.includes('/public/images/')) {
      img.src = lowaEncodeImagePath(src.replace('/public/images/', '/images/'));
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
