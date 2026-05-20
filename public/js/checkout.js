// ===============================
// Checkout - Stripe Payment Integration (SÉCURISÉ)
// ===============================

let stripe = null;
let elements = null;
let cartItems = [];
let cartTotal = 0;
let stripeInitialized = false;
let processingPayment = false;

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
// Cart Loading
// ===============================
function loadCartItems() {
  try {
    // Attendre que cart.js ait fini d'hydrater depuis le cloud
    // En fallback, lire directement le localStorage
    let savedCart = [];

    const raw = localStorage.getItem("lowa_cart") ||
                 localStorage.getItem("Lowa_cart") ||
                 sessionStorage.getItem("lowa_cart");

    savedCart = raw ? JSON.parse(raw) : [];
    cartItems = Array.isArray(savedCart) ? savedCart : [];

    // Si toujours vide, essayer window.cart (partagé depuis cart.js)
    if (cartItems.length === 0 && Array.isArray(window.cart)) {
      cartItems = window.cart;
    }

    cartTotal = cartItems.reduce((sum, item) => {
      return sum + (Number(item.price) || 0) * (Number(item.quantity) || 1);
    }, 0);

    console.log('📦 Panier:', cartItems.length, 'articles, total:', cartTotal);
    return true;
  } catch (e) {
    console.error("Erreur chargement panier", e);
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

  // 1. Vérifier le panier
  if (cartItems.length === 0) {
    console.log('⚠️ Panier vide, paiement désactivé');
    return;
  }

  try {
    showStatus("⏳ Initialisation du paiement...", "loading");
    console.log('1️⃣ Attendre SDK Stripe...');
    
    // 2. Attendre Stripe SDK
    await waitForStripe(10000);

    // 3. Récupérer la clé publique
    console.log('2️⃣ Récupérer clé publique Stripe...');
    const configRes = await fetch("/api/stripe/config", {
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

    // 4. Initialiser Stripe
    console.log('3️⃣ Initialiser Stripe avec clé...');
    stripe = window.Stripe(config.publicKey);
    console.log('✓ Stripe initialisé');

    // 5. Créer l'intention de paiement
    console.log('4️⃣ Créer PaymentIntent...');
    const amount = Math.round(cartTotal * 100); // En centimes
    console.log(`  Montant: ${amount} (${cartTotal}€)`);
    
    const intentRes = await fetch("/api/stripe/create-intent", {
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

    // 6. Créer les éléments
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
    console.error("❌ Erreur initiale:", error);
    stripeInitialized = false;
    showStatus(`❌ ${error.message}`, "error");
  }
}

// ===============================
// Payment Submission
// ===============================
async function handlePayClick() {
  // Sécurité: éviter les double-clics
  if (processingPayment) {
    console.log('⚠️ Paiement déjà en cours');
    return;
  }

  // Vérifier l'initialisation
  if (!stripeInitialized || !stripe || !elements) {
    showStatus("❌ Paiement non initialisé. Rechargez la page.", "error");
    console.error('Stripe ou elements non initialisés');
    return;
  }

  // Vérifier le panier
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
      
      // Message d'erreur détaillé
      let message = error.message || 'Paiement échoué';
      if (error.code === 'card_error') {
        message = error.message; // Ex: "Your card was declined"
      }
      showStatus(`❌ ${message}`, "error");
      
    } else if (paymentIntent) {
      console.log('✓ PaymentIntent status:', paymentIntent.status);
      
      if (paymentIntent.status === 'succeeded') {
        console.log('✅ Paiement réussi!');
        showStatus("✅ Paiement réussi! Redirection...", "success");
        
        // Vider le panier
        localStorage.removeItem("lowa_cart");
        localStorage.removeItem("Lowa_cart");
        console.log('🗑️ Panier vidé');
        
        // Rediriger
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

  // Charger le panier
  loadCartItems();
  renderOrderSummary();
  
  // Initialiser Stripe
  await initStripePayment();

  // Attacher le bouton de paiement
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
        const res = await fetch("/api/bank-transfer/create-order", {
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
        
        // Rediriger
        window.location.href = `/public/pages/payment-success.html?id=${data.orderId}&method=bank`;
      } catch (e) {
        console.error('❌ Erreur virement:', e);
        showStatus(`❌ ${e.message}`, "error");
      }
    });
  }
});

console.log('✓ checkout.js chargé');
