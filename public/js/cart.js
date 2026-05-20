/**
 * LOWA - Cart Module
 * Gestion du panier
 */

let cart = [];
const CART_STORAGE_KEY = 'lowa_cart';
let isHydratingCart = false;
window.isHydratingCart = false;

/**
 * Sauvegarder le panier dans localStorage
 * On sauvegarde TOUJOURS dans la clé plain "lowa_cart" ET dans la clé scopée
 * pour que checkout.js (autre page) puisse la lire sans avoir le scope
 */
function saveCartToStorage() {
  const serialized = JSON.stringify(cart);

  // Clé plain — toujours lisible depuis checkout.js
  localStorage.setItem(CART_STORAGE_KEY, serialized);

  // Clé scopée — si scopedStorageSet est disponible
  if (typeof scopedStorageSet === 'function') {
    scopedStorageSet(CART_STORAGE_KEY, serialized);
  }

  // Exposer globalement pour accès cross-page via window.cart
  window.cart = cart;
}

/**
 * Initialiser le panier
 */
function initCart() {
  // Lire d'abord la clé plain (la plus fiable cross-page)
  let raw = localStorage.getItem(CART_STORAGE_KEY);

  // Fallback sur la clé scopée si la clé plain est vide
  if (!raw && typeof scopedStorageGet === 'function') {
    raw = scopedStorageGet(CART_STORAGE_KEY);
  }

  try {
    cart = raw ? JSON.parse(raw) : [];
  } catch (e) {
    cart = [];
  }

  window.cart = cart;
  updateCartUI();
  setupCartListeners();
  hydrateCartFromCloud();
}

async function hydrateCartFromCloud() {
  isHydratingCart = true;
  window.isHydratingCart = true;

  try {
    const state = await lowaReadUserState();
    if (!state || !Array.isArray(state.cart) || state.cart.length === 0) return;

    // N'écraser le panier local que si le cloud en a un plus grand
    if (state.cart.length >= cart.length) {
      cart = state.cart;
      saveCartToStorage();
      updateCartUI();
    }
  } catch (e) {
    console.warn('Hydrate cart warning:', e && e.message ? e.message : e);
  } finally {
    isHydratingCart = false;
    window.isHydratingCart = false;
  }
}

/**
 * Mettre à jour l'affichage du panier
 */
function updateCartUI() {
  const cartCount = document.getElementById('cart-count');
  const cartItemsDiv = document.getElementById('cart-items');
  const cartTotalSpan = document.getElementById('cart-total');

  // Toujours sauvegarder même si les éléments DOM ne sont pas là (autre page)
  saveCartToStorage();

  if (!cartCount || !cartItemsDiv || !cartTotalSpan) return;

  cartCount.textContent = cart.length;
  cartItemsDiv.innerHTML = cart.map((item, idx) => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}" width="60" height="60" />
      <div class="info">
        <h4>${item.name}</h4>
        <p>${item.price.toFixed(2)} €</p>
      </div>
      <button class="btn" onclick="window.removeFromCart(${idx})" style="padding: 0.4rem 0.6rem; font-size: 0.85rem;">×</button>
    </div>
  `).join('');

  const total = cart.reduce((sum, item) => sum + item.price, 0);
  cartTotalSpan.textContent = total.toFixed(2);

  if (!isHydratingCart) {
    lowaWriteUserStatePatch({ cart: cart }).catch(() => {});
  }

  // Sync avec la DB si connecté
  if (typeof currentUser !== 'undefined' && currentUser && typeof sessionToken !== 'undefined' && sessionToken) {
    const cartData = cart.map(item => ({
      product_id: parseInt(item.id),
      quantity: item.quantity || 1
    }));
    fetch(LOWA.API.BASE + '/cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': sessionToken
      },
      body: JSON.stringify(cartData)
    }).catch(e => console.log('Cart sync error:', e));
  }
}

/**
 * Ajouter un article au panier
 */
function addToCart(item) {
  // Normaliser la quantité
  if (!item.quantity) item.quantity = 1;
  cart.push(item);
  updateCartUI();
}

/**
 * Retirer un article du panier
 */
window.removeFromCart = function(idx) {
  cart.splice(idx, 1);
  updateCartUI();
};

/**
 * Vider le panier complètement (utilisé après paiement)
 */
window.clearCart = function() {
  cart = [];
  localStorage.removeItem(CART_STORAGE_KEY);
  localStorage.removeItem('Lowa_cart');
  sessionStorage.removeItem(CART_STORAGE_KEY);
  window.cart = [];
  updateCartUI();
};

/**
 * Exposer le panier pour checkout.js
 */
window.getCart = function() {
  return cart;
};

/**
 * Configurer les écouteurs du panier
 */
function setupCartListeners() {
  const cartButton = document.getElementById('cart-button');
  const closeCartBtn = document.getElementById('close-cart');
  const cartModal = document.getElementById('cart-modal');
  const clearCartBtn = document.getElementById('clear-cart');
  const checkoutBtn = document.getElementById('checkout-link');

  if (!cartButton || !closeCartBtn || !cartModal) return;

  cartButton.addEventListener('click', () => {
    cartModal.setAttribute('aria-hidden', 'false');
  });

  closeCartBtn.addEventListener('click', () => {
    cartModal.setAttribute('aria-hidden', 'true');
  });

  cartModal.addEventListener('click', (e) => {
    if (e.target === cartModal) {
      cartModal.setAttribute('aria-hidden', 'true');
    }
  });

  if (clearCartBtn) {
    clearCartBtn.addEventListener('click', () => {
      cart = [];
      updateCartUI();
    });
  }

  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', (e) => {
      if (cart.length === 0) {
        e.preventDefault();
        alert('Votre panier est vide');
        return;
      }
      cartModal.setAttribute('aria-hidden', 'true');
    });
  }
}

// Initialiser le panier au chargement
document.addEventListener('DOMContentLoaded', () => {
  initCart();
});