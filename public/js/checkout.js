/**
 * LOWA - Checkout Module
 * Gestion unifiée du paiement (Stripe, PayPal, Apple Pay, Google Pay, Virement bancaire)
 */

let stripe;
let cardElement;
let currentPaymentMethod = 'stripe';
let cartItems = [];
let cartTotal = 0;

// ================== Initialisation ==================

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('year').textContent = new Date().getFullYear();
  
  loadCartItems();
  renderOrderSummary();
  
  // Initialiser Stripe
  try {
    const response = await fetch('/api/stripe/config');
    const { publicKey } = await response.json();
    stripe = Stripe(publicKey);
    initializeStripeCard();
  } catch (error) {
    console.error('Erreur Stripe:', error);
    showStatus('Erreur de configuration Stripe', 'error');
  }

  setupPaymentMethodButtons();
  setupPayPal();
  setupFormSubmission();
});

// ================== Gestion du panier ==================

function loadCartItems() {
  try {
    // Trouver la bonne clé du panier dynamiquement
    const cartKeys = Object.keys(localStorage).filter(k => k.startsWith('lowa_cart_') && k.endsWith('_v2'));
    let bestRaw = '[]';
    for (const key of cartKeys) {
        const data = JSON.parse(localStorage.getItem(key) || '[]');
    if (data.length > JSON.parse(bestRaw).length) {
        bestRaw = localStorage.getItem(key);
    }
}
const raw = bestRaw;
    cartItems = JSON.parse(raw);
    cartTotal = cartItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  } catch (error) {
    console.error('Erreur de chargement du panier:', error);
    cartItems = [];
    cartTotal = 0;
  }
}

function renderOrderSummary() {
  const orderItems = document.getElementById('order-items');
  const subtotal = document.getElementById('subtotal');
  const total = document.getElementById('order-total');
  const stripeAmount = document.getElementById('stripe-amount');

  if (!orderItems || !subtotal || !total) return;

  // Rendre les articles
  if (cartItems.length === 0) {
    orderItems.innerHTML = '<div class="empty-state">Votre panier est vide. <a href="/index.html">Retour aux produits</a></div>';
  } else {
    orderItems.innerHTML = cartItems.map((item) => `
      <div class="order-item">
        <img src="${item.image || '/public/images/logo.png'}" alt="${item.name}" />
        <div class="order-item-meta">
          <strong>${item.name}</strong>
          <span>Qté: 1</span>
        </div>
        <div class="order-item-price">${formatPrice(item.price)} €</div>
      </div>
    `).join('');
  }

  // Mise à jour des montants
  const shippingFree = true; // Gratuit pour cet exemple
  subtotal.textContent = formatPrice(cartTotal) + ' €';
  total.textContent = formatPrice(cartTotal) + ' €';
  if (stripeAmount) stripeAmount.textContent = formatPrice(cartTotal) + ' €';
}

function formatPrice(value) {
  return (Number(value) || 0).toFixed(2).replace('.', ',');
}

// ================== Gestion des méthodes de paiement ==================

function setupPaymentMethodButtons() {
  const buttons = document.querySelectorAll('.payment-option-btn');
  
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const method = btn.dataset.method;
      switchPaymentMethod(method);
    });
  });
}

function switchPaymentMethod(method) {
  currentPaymentMethod = method;
  
  // Mettre à jour les boutons
  document.querySelectorAll('.payment-option-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.method === method);
  });

  // Masquer tous les formulaires
  document.querySelectorAll('.payment-form').forEach(form => {
    form.classList.add('hidden');
  });

  // Afficher le formulaire sélectionné
  const selectedForm = document.getElementById(`${method}-payment`);
  if (selectedForm) {
    selectedForm.classList.remove('hidden');
    selectedForm.classList.add('active');
  }

  console.log('Méthode de paiement changée:', method);
}

// ================== Stripe ==================

function initializeStripeCard() {
  if (!stripe) return;

  const elements = stripe.elements();
  cardElement = elements.create('card', {
    style: {
      base: {
        fontSize: '16px',
        color: '#424242',
        '::placeholder': { color: '#9e9e9e' }
      }
    }
  });

  cardElement.mount('#card-element');
  cardElement.addEventListener('change', (e) => {
    if (e.error) {
      showStatus('❌ ' + e.error.message, 'error');
    }
  });
}

function setupFormSubmission() {
  const stripeForm = document.getElementById('stripe-form');
  if (stripeForm) {
    stripeForm.addEventListener('submit', handleStripePayment);
  }

  const bankTransferBtn = document.getElementById('bank-transfer-btn');
  if (bankTransferBtn) {
    bankTransferBtn.addEventListener('click', handleBankTransfer);
  }

  const applePayBtn = document.getElementById('apple-pay-btn');
  if (applePayBtn) {
    applePayBtn.addEventListener('click', handleApplePay);
  }

  const googlePayBtn = document.getElementById('google-pay-btn');
  if (googlePayBtn) {
    googlePayBtn.addEventListener('click', handleGooglePay);
  }
}

async function handleStripePayment(e) {
  e.preventDefault();
  
  if (cartItems.length === 0) {
    showStatus('⚠️ Votre panier est vide', 'error');
    return;
  }

  const stripeBtn = document.getElementById('stripe-btn');
  stripeBtn.disabled = true;
  showStatus('Traitement du paiement...', 'loading');

  try {
    // Créer une intention de paiement
    const response = await fetch('/api/stripe/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(cartTotal * 100), // en centimes
        currency: 'eur',
        items: cartItems
      })
    });

    const { clientSecret } = await response.json();
    if (!clientSecret) throw new Error('Impossible de créer l\'intention de paiement');

    // Confirmer le paiement
    const { paymentIntent, error } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: document.getElementById('card-name').value,
          email: document.getElementById('card-email').value,
          address: {
            line1: document.getElementById('card-address').value,
            city: document.getElementById('card-city').value,
            postal_code: document.getElementById('card-postal').value
          }
        }
      }
    });

    if (error) {
      showStatus('❌ Erreur: ' + error.message, 'error');
      stripeBtn.disabled = false;
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      showStatus('✅ Paiement réussi!', 'success');
      setTimeout(() => {
        window.location.href = `/public/pages/order-success.html?orderId=${paymentIntent.id}`;
      }, 2000);
    }
  } catch (error) {
    console.error('Erreur Stripe:', error);
    showStatus('❌ ' + error.message, 'error');
    stripeBtn.disabled = false;
  }
}



// ================== Virement Bancaire ==================

async function handleBankTransfer() {
  if (cartItems.length === 0) {
    showStatus('⚠️ Votre panier est vide', 'error');
    return;
  }

  showStatus('Création de la commande...', 'loading');

  try {
    const response = await fetch('/api/bank-transfer/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cartItems,
        method: 'bank_transfer'
      })
    });

    const data = await response.json();
    if (data.success) {
      showStatus('✅ Commande créée! En attente du virement bancaire.', 'success');
      setTimeout(() => {
        window.location.href = `/public/pages/order-success.html?orderId=${data.orderId}&method=bank_transfer`;
      }, 2000);
    }
  } catch (error) {
    console.error('Erreur création commande:', error);
    showStatus('❌ ' + error.message, 'error');
  }
}

// ================== Utilitaires ==================

function showStatus(message, type = 'info') {
  const status = document.getElementById('checkout-status');
  if (!status) return;
  
  status.textContent = message;
  status.className = `checkout-status ${type}`;
  status.classList.remove('hidden');
  
  if (type !== 'loading' && type !== 'info') {
    setTimeout(() => {
      status.classList.add('hidden');
    }, 5000);
  }
}

// Gestion du retour au cart depuis le modal
window.addEventListener('beforeunload', (e) => {
  if (currentPaymentMethod === 'paypal' && window.paypalLoaded) {
    // Laisser PayPal gérer la navigation
    return;
  }
});
