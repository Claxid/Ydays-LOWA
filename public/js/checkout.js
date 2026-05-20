// ===============================
// Checkout - Stripe Payment Integration (SÉCURISÉ)
// ===============================

let stripe = null;
let elements = null;
let cartItems = [];
let cartTotal = 0;
let stripeInitialized = false;
let processingPayment = false;

// Base URL API — définie dans /config/supabase.config.js ou common.js
const API_BASE = window.API_BASE
  || (window.LOWA && window.LOWA.API && window.LOWA.API.BASE)
  || '/api';

// ===============================
// Utils
// ===============================
function showStatus(message, type = "info") {
  const status = document.getElementById("checkout-status");
  if (!status) return;

  status.textContent = message;
  status.className = `checkout-status ${type}`;
  status.classList.remove("hidden");

  if (type !== "loading") {
    setTimeout(() => status.classList.add("hidden"), 4000);
  }
}

function formatPrice(value) {
  return `${Number(value).toFixed(2).replace(".", ",")} €`;
}

// Attendre que Stripe SDK soit chargé
async function waitForStripe(timeout = 10000) {
  const startTime = Date.now();
  while (!window.Stripe) {
    if (Date.now() - startTime > timeout) {
      throw new Error("SDK Stripe n'a pas pu être chargé. Vérifiez votre connexion ou désactivez les ad-blockers.");
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  console.log('✓ SDK Stripe détecté');
  return window.Stripe;
}

// ===============================
// Attendre la fin d'hydratation du panier (cart.js async)
// ===============================
async function waitForCartHydration(timeout = 3000) {
  const start = Date.now();
  return new Promise(resolve => {
    const check = () => {
      // window.isHydratingCart est mis à false par cart.js une fois terminé
      if (!window.isHydratingCart || Date.now() - start > timeout) {
        return resolve();
      }
      setTimeout(check, 100);
    };
    // Laisser un tick pour que cart.js ait eu le temps de poser isHydratingCart = true
    setTimeout(check, 150);
  });
}

// ===============================
// Cart Loading
// ===============================
function loadCartItems() {
  try {
    cartItems = [];

    // 1. Priorité : window.cart exposé par cart.js (source la plus fraîche)
    if (Array.isArray(window.cart) && window.cart.length > 0) {
      cartItems = window.cart;
      console.log('📦 Panier depuis window.cart:', cartItems.length, 'article(s)');

    // 2. Fallback : localStorage clé plain "lowa_cart"
    } else {
      const raw = localStorage.getItem("lowa_cart") ||
                  localStorage.getItem("Lowa_cart") ||
                  sessionStorage.getItem("lowa_cart");

      if (raw) {
        const parsed = JSON.parse(raw);
        cartItems = Array.isArray(parsed) ? parsed : [];
        console.log('📦 Panier depuis localStorage:', cartItems.length, 'article(s)');
      }

      // 3. Dernier recours : window.getCart() si cart.js est chargé sur cette page
      if (cartItems.length === 0 && typeof window.getCart === 'function') {
        cartItems = window.getCart();
        console.log('📦 Panier depuis getCart():', cartItems.length, 'article(s)');
      }
    }

    // Normaliser les quantités manquantes
    cartItems = cartItems.map(item => ({
      ...item,
      quantity: Number(item.quantity) || 1,
      price: Number(item.price) || 0
    }));

    // Calculer le total
    cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    console.log('💰 Total panier:', cartTotal, '€');
    return true;
  } catch (e) {
    console.error("❌ Erreur chargement panier", e);
    cartItems = [];
    cartTotal = 0;
    return false;
  }
}

function renderOrderSummary() {
  const list = document.getElementById("order-items");
  const totalEl = document.getElementById("order-total");
  const subtotalEl = document.getElementById("subtotal");
  const shippingEl = document.getElementById("shipping");

  if (!list) return;

  list.innerHTML = "";

  if (cartItems.length === 0) {
    list.innerHTML = "<p>Votre panier est vide.</p>";
    if (subtotalEl) subtotalEl.textContent = formatPrice(0);
    if (shippingEl) shippingEl.textContent = "Gratuit";
    if (totalEl) totalEl.textContent = formatPrice(0);

    const payBtn = document.getElementById("pay-button");
    if (payBtn) {
      payBtn.disabled = true;
      payBtn.textContent = "Panier vide";
    }
    return;
  }

  cartItems.forEach(item => {
    const div = document.createElement("div");
    div.className = "order-item";
    div.innerHTML = `
      <span>${item.name} × ${item.quantity}</span>
      <strong>${formatPrice(item.price * item.quantity)}</strong>
    `;
    list.appendChild(div);
  });

  if (subtotalEl) subtotalEl.textContent = formatPrice(cartTotal);
  if (shippingEl) shippingEl.textContent = "Gratuit";
  if (totalEl) totalEl.textContent = formatPrice(cartTotal);
}

// ===============================
// Stripe Payment - Main Logic
// ===============================
async function initStripePayment() {
  console.log('🚀 Initialisation du paiement...');

  if (cartItems.length === 0) {
    console.log('⚠️ Panier vide, paiement désactivé');
    return;
  }

  try {
    showStatus("⏳ Initialisation du paiement...", "loading");

    // 1. Attendre Stripe SDK
    console.log('1️⃣ Attendre SDK Stripe...');
    await waitForStripe(10000);

    // 2. Récupérer la clé publique
    console.log('2️⃣ Récupérer clé publique Stripe... via', API_BASE);
    const configRes = await fetch(`${API_BASE}/stripe/config`, {
      headers: { 'Accept': 'application/json' }
    });

    if (!configRes.ok) {
      const err = await configRes.json().catch(() => ({ error: 'Erreur config' }));
      throw new Error(err.error || err.solution || `HTTP ${configRes.status}`);
    }

    const config = await configRes.json();
    if (!config.publicKey) throw new Error('Clé publique Stripe manquante');
    console.log('✓ Clé Stripe reçue');

    // 3. Initialiser Stripe
    stripe = window.Stripe(config.publicKey);
    console.log('✓ Stripe initialisé');

    // 4. Créer le PaymentIntent
    const amount = Math.round(cartTotal * 100);
    console.log(`4️⃣ Créer PaymentIntent: ${amount} centimes (${cartTotal} €)`);

    const intentRes = await fetch(`${API_BASE}/stripe/create-intent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        amount: amount,
        currency: "eur",
        items: cartItems.map(i => ({ name: i.name, price: i.price }))
      }),
    });

    if (!intentRes.ok) {
      const err = await intentRes.json().catch(() => ({ error: 'Erreur création intent' }));
      throw new Error(err.error || err.solution || `HTTP ${intentRes.status}`);
    }

    const intentData = await intentRes.json();
    if (!intentData.clientSecret) throw new Error('clientSecret manquant');
    console.log('✓ Intent créée:', intentData.paymentIntentId);

    // 5. Monter le Payment Element
    elements = stripe.elements({
      clientSecret: intentData.clientSecret,
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: '#d4a5a5',
          colorText: '#333333',
          colorBackground: '#ffffff',
          borderRadius: '6px'
        }
      }
    });

    const paymentElement = elements.create("payment");
    paymentElement.mount("#payment-element");
    console.log('✓ Payment Element monté');

    stripeInitialized = true;
    showStatus("✓ Paiement prêt", "success");
    console.log('✓✓✓ Paiement initialisé avec succès');

  } catch (error) {
    console.error("❌ Erreur initialisation:", error);
    stripeInitialized = false;
    showStatus(`❌ ${error.message}`, "error");
  }
}

// ===============================
// Payment Submission
// ===============================
async function handlePayClick() {
  if (processingPayment) return;

  if (!stripeInitialized || !stripe || !elements) {
    showStatus("❌ Paiement non initialisé. Rechargez la page.", "error");
    return;
  }

  if (cartItems.length === 0) {
    showStatus("❌ Votre panier est vide", "error");
    return;
  }

  processingPayment = true;
  showStatus("⏳ Traitement du paiement...", "loading");

  try {
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/public/pages/payment-success.html`,
      },
      redirect: "if_required"
    });

    if (error) {
      processingPayment = false;
      showStatus(`❌ ${error.message || 'Paiement échoué'}`, "error");

    } else if (paymentIntent) {
      if (paymentIntent.status === 'succeeded') {
        showStatus("✅ Paiement réussi ! Redirection...", "success");

        // Vider le panier partout
        localStorage.removeItem("lowa_cart");
        localStorage.removeItem("Lowa_cart");
        sessionStorage.removeItem("lowa_cart");
        window.cart = [];
        if (typeof window.clearCart === 'function') window.clearCart();

        setTimeout(() => {
          window.location.href = `/public/pages/payment-success.html?id=${paymentIntent.id}`;
        }, 1500);

      } else if (paymentIntent.status === 'processing') {
        showStatus("⏳ Paiement en cours. Veuillez patienter...", "loading");
        processingPayment = false;

      } else {
        showStatus(`ℹ️ Statut: ${paymentIntent.status}`, "info");
        processingPayment = false;
      }
    }
  } catch (error) {
    processingPayment = false;
    showStatus(`❌ ${error.message}`, "error");
  }
}

// ===============================
// Page Initialization
// ===============================
document.addEventListener("DOMContentLoaded", async () => {
  console.log('📄 Checkout chargé — API_BASE:', API_BASE);

  // Footer year
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // ⏳ Attendre que cart.js ait fini d'hydrater depuis Supabase
  console.log('⏳ Attente hydratation panier cloud...');
  await waitForCartHydration(3000);
  console.log('✓ Hydratation terminée');

  // Charger et afficher le panier
  loadCartItems();
  renderOrderSummary();

  // Initialiser Stripe seulement si le panier n'est pas vide
  if (cartItems.length > 0) {
    await initStripePayment();
  }

  // Bouton payer
  const payBtn = document.getElementById("pay-button");
  if (payBtn) {
    payBtn.addEventListener("click", handlePayClick);
  }

  // Switcher méthodes de paiement
  document.querySelectorAll(".payment-option-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".payment-option-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const method = btn.dataset.method;
      document.querySelectorAll(".payment-form").forEach(f => f.classList.add("hidden"));
      document.getElementById(`${method}-payment`)?.classList.remove("hidden");
    });
  });

  // Bouton virement bancaire
  const bankBtn = document.getElementById("bank-transfer-btn");
  if (bankBtn) {
    bankBtn.addEventListener("click", async () => {
      showStatus("⏳ Création de la commande...", "loading");

      try {
        const res = await fetch(`${API_BASE}/bank-transfer/create-order`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: cartTotal, items: cartItems })
        });

        if (!res.ok) throw new Error(`Erreur ${res.status}`);
        const data = await res.json();

        // Vider le panier
        localStorage.removeItem("lowa_cart");
        localStorage.removeItem("Lowa_cart");
        sessionStorage.removeItem("lowa_cart");
        window.cart = [];
        if (typeof window.clearCart === 'function') window.clearCart();

        window.location.href = `/public/pages/payment-success.html?id=${data.orderId}&method=bank`;
      } catch (e) {
        showStatus(`❌ ${e.message}`, "error");
      }
    });
  }
});

console.log('✓ checkout.js chargé');