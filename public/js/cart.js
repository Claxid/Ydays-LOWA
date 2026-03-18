/**
 * LOWA - Cart Module
 * Gestion du panier
 */

let cart = [];
const CART_STORAGE_KEY = 'lowa_cart';

/**
 * Initialiser le panier
 */
function initCart() {
  const raw = (typeof scopedStorageGet === 'function')
    ? scopedStorageGet(CART_STORAGE_KEY)
    : localStorage.getItem(CART_STORAGE_KEY);
  cart = raw ? JSON.parse(raw) : [];
  updateCartUI();
  setupCartListeners();
}

/**
 * Mettre à jour l'affichage du panier
 */
function updateCartUI() {
  const cartCount = document.getElementById('cart-count');
  const cartItemsDiv = document.getElementById('cart-items');
  const cartTotalSpan = document.getElementById('cart-total');
  
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
  if (typeof scopedStorageSet === 'function') {
    scopedStorageSet(CART_STORAGE_KEY, JSON.stringify(cart));
  } else {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }
  
  // Sync with database if logged in
  if (currentUser && sessionToken) {
    const cartData = cart.map(item => ({
      product_id: parseInt(item.id),
      quantity: 1
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
 * Configurer les écouteurs du panier
 */
function setupCartListeners() {
  const cartButton = document.getElementById('cart-button');
  const closeCartBtn = document.getElementById('close-cart');
  const cartModal = document.getElementById('cart-modal');
  const clearCartBtn = document.getElementById('clear-cart');
  const checkoutBtn = document.getElementById('checkout');
  
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
    checkoutBtn.addEventListener('click', () => {
      if (cart.length === 0) {
        alert('Votre panier est vide');
        return;
      }
      const total = document.getElementById('cart-total').textContent;
      alert(`Commande de ${cart.length} article(s) pour ${total} €\nRedirection vers le paiement...`);
      cart = [];
      updateCartUI();
      cartModal.setAttribute('aria-hidden', 'true');
    });
  }
}

// Initialiser le panier au chargement
document.addEventListener('DOMContentLoaded', () => {
  initCart();
});
