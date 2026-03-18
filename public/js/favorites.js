/**
 * LOWA - Favorites Module
 * Gestion des favoris
 */

let favorites = [];

/**
 * Charger les favoris depuis le stockage
 */
function loadFavoritesFromStorage() {
  try {
    const raw = (typeof scopedStorageGet === 'function')
      ? scopedStorageGet(LOWA.STORAGE.FAVORITES_KEY)
      : localStorage.getItem(LOWA.STORAGE.FAVORITES_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    favorites = Array.from(new Set(arr.map(v => parseInt(v, 10)).filter(n => Number.isFinite(n))));
    if (typeof scopedStorageSet === 'function') {
      scopedStorageSet(LOWA.STORAGE.FAVORITES_KEY, JSON.stringify(favorites));
    } else {
      localStorage.setItem(LOWA.STORAGE.FAVORITES_KEY, JSON.stringify(favorites));
    }
  } catch (e) {
    favorites = [];
    if (typeof scopedStorageSet === 'function') {
      scopedStorageSet(LOWA.STORAGE.FAVORITES_KEY, JSON.stringify(favorites));
    } else {
      localStorage.setItem(LOWA.STORAGE.FAVORITES_KEY, JSON.stringify(favorites));
    }
  }
}

async function hydrateFavoritesFromCloud() {
  try {
    const state = await lowaReadUserState();
    if (!state || !Array.isArray(state.favorites)) return;
    favorites = Array.from(new Set(state.favorites.map(v => parseInt(v, 10)).filter(n => Number.isFinite(n))));
    if (typeof scopedStorageSet === 'function') {
      scopedStorageSet(LOWA.STORAGE.FAVORITES_KEY, JSON.stringify(favorites));
    } else {
      localStorage.setItem(LOWA.STORAGE.FAVORITES_KEY, JSON.stringify(favorites));
    }
    if (typeof sortAndDisplayProducts === 'function') {
      sortAndDisplayProducts();
    }
  } catch (e) {
    console.warn('Hydrate favorites warning:', e && e.message ? e.message : e);
  }
}

/**
 * Vérifier si un produit est en favoris
 */
function isFavorite(productId) {
  const idNum = parseInt(productId, 10);
  return favorites.includes(idNum);
}

/**
 * Basculer le statut favori
 */
async function toggleFavorite(productId) {
  console.log('🔄 toggleFavorite called for product:', productId);
  const idNum = parseInt(productId, 10);
  const index = favorites.indexOf(idNum);
  if (index > -1) {
    favorites.splice(index, 1);
    console.log('➖ Removed from favorites');
  } else {
    favorites.push(idNum);
    console.log('➕ Added to favorites');
  }
  favorites = Array.from(new Set(favorites));
  if (typeof scopedStorageSet === 'function') {
    scopedStorageSet(LOWA.STORAGE.FAVORITES_KEY, JSON.stringify(favorites));
  } else {
    localStorage.setItem(LOWA.STORAGE.FAVORITES_KEY, JSON.stringify(favorites));
  }
  console.log('💾 Local storage updated, current favorites:', favorites);

  console.log('☁️ Syncing to cloud...');
  const result = await lowaWriteUserStatePatch({ favorites: favorites });
  console.log('☁️ Cloud sync result:', result);
}

/**
 * Attacher les événements des favoris
 */
function attachFavoriteListeners() {
  const buttons = document.querySelectorAll('.fav-btn');
  console.log('📌 attachFavoriteListeners called');
  console.log('📌 Found', buttons.length, 'favorite buttons');
  
  buttons.forEach((btn, index) => {
    console.log(`📌 Attaching listener to button ${index}, data-id="${btn.dataset.id}"`);
    btn.addEventListener('click', (e) => {
      console.log('🖱️ Favorite button clicked!', e.target.dataset.id);
      const run = async () => {
        e.stopPropagation();
        if (!requireAuth('Connectez-vous ou créez un compte pour gérer vos favoris.')) {
          console.warn('⚠️ Auth check failed');
          return;
        }
        const productId = e.target.dataset.id;
        await toggleFavorite(productId);
        e.target.classList.toggle('active');
        e.target.style.transform = 'scale(1.3)';
        setTimeout(() => { e.target.style.transform = ''; }, 200);
      };
      run().catch((err) => {
        console.error('❌ Error in favorite handler:', err);
      });
    });
  });
}

// Initialiser les favoris au chargement
document.addEventListener('DOMContentLoaded', () => {
  loadFavoritesFromStorage();
  hydrateFavoritesFromCloud();
});
