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
    const raw = localStorage.getItem(LOWA.STORAGE.FAVORITES_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    favorites = Array.from(new Set(arr.map(v => parseInt(v, 10)).filter(n => Number.isFinite(n))));
    localStorage.setItem(LOWA.STORAGE.FAVORITES_KEY, JSON.stringify(favorites));
  } catch (e) {
    favorites = [];
    localStorage.setItem(LOWA.STORAGE.FAVORITES_KEY, JSON.stringify(favorites));
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
function toggleFavorite(productId) {
  const idNum = parseInt(productId, 10);
  const index = favorites.indexOf(idNum);
  if (index > -1) {
    favorites.splice(index, 1);
  } else {
    favorites.push(idNum);
  }
  favorites = Array.from(new Set(favorites));
  localStorage.setItem(LOWA.STORAGE.FAVORITES_KEY, JSON.stringify(favorites));
}

/**
 * Attacher les événements des favoris
 */
function attachFavoriteListeners() {
  document.querySelectorAll('.fav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!requireAuth('Connectez-vous ou créez un compte pour gérer vos favoris.')) {
        return;
      }
      const productId = e.target.dataset.id;
      toggleFavorite(productId);
      e.target.classList.toggle('active');
      e.target.style.transform = 'scale(1.3)';
      setTimeout(() => { e.target.style.transform = ''; }, 200);
    });
  });
}

// Initialiser les favoris au chargement
document.addEventListener('DOMContentLoaded', () => {
  loadFavoritesFromStorage();
});
