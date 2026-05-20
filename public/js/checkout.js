// ===============================
// Checkout - Stripe Payment Integration (SÉCURISÉ)
// ===============================

let stripe = null;
let elements = null;
let cartItems = [];
let cartTotal = 0;
let stripeInitialized = false;
let processingPayment = false;

// Base URL de l'API (définie dans /config/supabase.config.js)
const API_BASE = window.API_BASE || '/api';

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
  return `${value.toFixed(2).replace(".", ",")} €`;
}

// Attendre que Stripe soit chargé (SDK externe)
async function waitForStripe(timeout = 10000) {
  const startTime = Date.now();
  while (!window.Stripe) {
    if (Date.now() - startTime > timeout) {
      throw new Error('SDK Stripe n\'a pas pu être chargé. Vérifiez votre connexion ou désactivez les ad-blockers.');
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  console.log('✓ SDK Stripe détecté');
  return window.Stripe;
}

// ===============================
// Attendre l'hydratation du panier depuis le cloud (cart.js)
// ===============================
async function waitForCartHydration(timeout = 3000) {
  const start = Date.now();
  return new Promise(resolve => {
    const check = () => {
      const raw = localStorage.getItem("lowa_cart") || localStorage.getItem("Lowa_cart");
      const cloudDone = !window.isHydratingCart; // flag exposé par cart.js
      if ((raw && cloudDone) || Date.now() - start > timeout) {
        return resolve();
      }
      setTimeout(check, 100);
    };
    check();
  });
}

// ===============================
// Cart Loading
// ===============================
function loadCartItems() {
  try {
    let savedCart = [];

    // 1. Lire depuis localStorage (toutes les variantes de clé)
    const raw = localStorage.getItem("lowa_cart") ||
                localStorage.getItem("Lowa_cart") ||
                sessionStorage.getItem("lowa_cart");

    savedCart = raw ? JSON.parse(raw) : [];
    cartItems = Array.isArray(savedCart) ? savedCart : [];

    // 2. Fallback : utiliser window.cart exposé par cart.js
    if (cartItems.length === 0 && Array.isArray(window.cart) && window.cart.length > 0) {
      cartItems = window.cart;
      console.log('📦 Panier chargé depuis window.cart');
    }

    // 3. Calculer le total
    cartTotal = cartItems.reduce((sum, item) => {
      return sum + (Number(item.price) || 0) * (Number(item.quantity) || 1);
    }, 0);

    console.log('📦 Panier:', cartItems.length, 'article(s), total:', cartTotal, '€');
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
    const qty = Number(item.quantity) || 1;
    const div = document.createElement("div");
    div.className = "order-item";
    div.innerHTML = `
      <span>${item.name} × ${qty}</span>
      <strong>${formatPrice(Number(item.price) * qty)}</strong>
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

    // 2. Récupérer la clé publique via API_BASE
    console.log('2️⃣ Récupérer clé publique Stripe...');
    const configRes = await fetch(`${API_BASE}/stripe/config`, {
      headers: { 'Accept': 'application/json' }
    });

    if (!configRes.ok) {
      const err = await configRes.json().catch(() => ({ error: 'Erreur config' }));
      throw new Error(err.error || err.solution || `HTTP ${configRes.status}`);
    }

    const config = await configRes.json();
    console.log('✓ Clé reçue');

    if (!config.publicKey) {
      throw new Error('Clé publique Stripe manquante');
    }

    // 3. Initialiser Stripe
    console.log('3️⃣ Initialiser Stripe avec clé...');
    stripe = window.Stripe(config.publicKey);
    console.log('✓ Stripe initialisé');

    // 4. Créer l'intention de paiement via API_BASE
    console.log('4️⃣ Créer PaymentIntent...');
    const amount = Math.round(cartTotal * 100); // En centimes
    console.log(`  Montant: ${amount} centimes (${cartTotal} €)`);

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
      console.error('Erreur intent:', err);
      throw new Error(err.error || err.solution || `HTTP ${intentRes.status}`);
    }

    const intentData = await intentRes.json();
    console.log('✓ Intent créée:', intentData.paymentIntentId);

    if (!intentData.clientSecret) {
      throw new Error('clientSecret manquant');
    }

    // 5. Créer les éléments Stripe
    console.log('5️⃣ Créer Payment Element...');
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
    console.log('✓✓✓ Paiement initialisé avec succès\n');

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
  if (processingPayment) {
    console.log('⚠️ Paiement déjà en cours');
    return;
  }

  if (!stripeInitialized || !stripe || !elements) {
    showStatus("❌ Paiement non initialisé. Rechargez la page.", "error");
    console.error('Stripe ou elements non initialisés');
    return;
  }

  if (cartItems.length === 0) {
    showStatus("❌ Votre panier est vide", "error");
    return;
  }

  processingPayment = true;
  showStatus("⏳ Traitement du paiement...", "loading");
  console.log('💳 Confirmation du paiement...');

  try {
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/public/pages/payment-success.html`,
      },
      redirect: "if_required"
    });

    if (error) {
      console.error('❌ Erreur paiement:', error);
      processingPayment = false;
      const message = error.message || 'Paiement échoué';
      showStatus(`❌ ${message}`, "error");

    } else if (paymentIntent) {
      console.log('✓ PaymentIntent status:', paymentIntent.status);

      if (paymentIntent.status === 'succeeded') {
        console.log('✅ Paiement réussi!');
        showStatus("✅ Paiement réussi! Redirection...", "success");

        // Vider le panier partout
        localStorage.removeItem("lowa_cart");
        localStorage.removeItem("Lowa_cart");
        sessionStorage.removeItem("lowa_cart");
        window.cart = [];
        console.log('🗑️ Panier vidé');

        setTimeout(() => {
          window.location.href = `/public/pages/payment-success.html?id=${paymentIntent.id}`;
        }, 1500);

      } else if (paymentIntent.status === 'processing') {
        console.log('⏳ Paiement en cours...');
        showStatus("⏳ Paiement en cours de traitement. Veuillez patienter...", "loading");
        processingPayment = false;

      } else {
        console.log('ℹ️ Statut:', paymentIntent.status);
        showStatus(`ℹ️ Statut: ${paymentIntent.status}`, "info");
        processingPayment = false;
      }
    }
  } catch (error) {
    console.error('❌ Erreur confirmation:', error);
    processingPayment = false;
    showStatus(`❌ ${error.message}`, "error");
  }
}

// ===============================
// Page Initialization
// ===============================
document.addEventListener("DOMContentLoaded", async () => {
  console.log('📄 Page chargée');

  // Footer year
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // ⏳ Attendre que cart.js ait fini d'hydrater le panier depuis le cloud
  console.log('⏳ Attente hydratation panier...');
  await waitForCartHydration(3000);
  console.log('✓ Hydratation terminée');

  // Charger et afficher le panier
  loadCartItems();
  renderOrderSummary();

  // Initialiser Stripe
  await initStripePayment();

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

      console.log('Méthode sélectionnée:', method);
    });
  });

  // Bouton virement bancaire
  const bankBtn = document.getElementById("bank-transfer-btn");
  if (bankBtn) {
    bankBtn.addEventListener("click", async () => {
      console.log('Virement bancaire sélectionné');
      showStatus("⏳ Création de la commande...", "loading");

      try {
        const res = await fetch(`${API_BASE}/bank-transfer/create-order`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: cartTotal,
            items: cartItems
          })
        });

        if (!res.ok) throw new Error(`Erreur ${res.status}`);

        const data = await res.json();

        // Vider le panier
        localStorage.removeItem("lowa_cart");
        localStorage.removeItem("Lowa_cart");
        sessionStorage.removeItem("lowa_cart");
        window.cart = [];

        window.location.href = `/public/pages/payment-success.html?id=${data.orderId}&method=bank`;
      } catch (e) {
        console.error('❌ Erreur virement:', e);
        showStatus(`❌ ${e.message}`, "error");
      }
    });
  }
});

console.log('✓ checkout.js chargé');