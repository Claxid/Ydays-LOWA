// ===============================
// Checkout - Stripe Payment Element ONLY
// ===============================

let stripe;
let elements;
let cartItems = [];
let cartTotal = 0;

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

// ===============================
// Cart
// ===============================
function loadCartItems() {
  try {
    // Essayer plusieurs clés possibles pour la compatibilité
    let savedCart = JSON.parse(localStorage.getItem("lowa_cart")) || 
                   JSON.parse(localStorage.getItem("Lowa_cart")) ||
                   [];
    cartItems = Array.isArray(savedCart) ? savedCart : [];

    // Calculer le total
    cartTotal = cartItems.reduce((sum, item) => {
      const price = Number(item.price) || 0;
      const quantity = Number(item.quantity) || 1;
      return sum + (price * quantity);
    }, 0);
    
    console.log('📦 Panier chargé:', { items: cartItems.length, total: cartTotal });
  } catch (e) {
    console.error("❌ Erreur chargement panier", e);
    cartItems = [];
    cartTotal = 0;
  }
}

function renderOrderSummary() {
  const list = document.getElementById("order-items");
  const totalEl = document.getElementById("order-total");
  if (!list || !totalEl) return;

  list.innerHTML = "";

  if (cartItems.length === 0) {
    list.innerHTML = "<p>Votre panier est vide.</p>";
    totalEl.textContent = formatPrice(0);
    return;
  }


    const payBtn = document.getElementById("pay-button");
    if (cartItems.length === 0 && payBtn) {
        payBtn.disabled = true;
        payBtn.textContent = "Panier vide";
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

  totalEl.textContent = formatPrice(cartTotal);
}

// ===============================
// Stripe Payment Element
// ===============================
async function initStripePayment() {
  if (cartItems.length === 0) {
    showStatus("⚠️ Votre panier est vide", "error");
    return;
  }

  try {
    // 1. Récupération clé publique
    console.log('🔐 Récupération de la configuration Stripe...');
    const configRes = await fetch("/api/stripe/config");
    
    if (!configRes.ok) {
      throw new Error(`Erreur config: ${configRes.status} - ${configRes.statusText}`);
    }

    const configData = await configRes.json();
    console.log('✓ Config reçue:', { hasPublicKey: !!configData.publicKey });
    
    if (!configData.publicKey) {
      throw new Error('Clé publique Stripe manquante. Configurez STRIPE_PUBLIC_KEY dans les variables d\'environnement.');
    }

    stripe = Stripe(configData.publicKey);
    console.log('✓ Stripe initialisé');

    // 2. Création PaymentIntent
    console.log('💳 Création de l\'intention de paiement...');
    const intentRes = await fetch("/api/stripe/create-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Math.round(cartTotal * 100),
      }),
    });

    if (!intentRes.ok) {
      const errorData = await intentRes.json();
      throw new Error(`Erreur intention: ${errorData.error || intentRes.statusText}`);
    }

    const intentData = await intentRes.json();
    console.log('✓ Intent créée');

    if (!intentData.clientSecret) {
      throw new Error('clientSecret manquant de la réponse');
    }

    // 3. Elements
    console.log('🎨 Création des éléments de paiement...');
    elements = stripe.elements({ clientSecret: intentData.clientSecret });

    // 4. Payment Element
    const paymentElement = elements.create("payment");
    paymentElement.mount("#payment-element");
    
    console.log('✓ Paiement initialisé avec succès');

  } catch (error) {
    console.error("❌ Erreur Stripe:", error);
    showStatus(`❌ Erreur: ${error.message || 'Impossible d\'initialiser le paiement'}`, "error");
  }
}

// ===============================
// Paiement
// ===============================
async function handlePayClick() {
  if (!stripe || !elements) {
    showStatus("❌ Erreur: Paiement non initialisé. Rechargez la page.", "error");
    console.error('Stripe ou elements non initialisés');
    return;
  }

  if (cartItems.length === 0) {
    showStatus("❌ Votre panier est vide", "error");
    return;
  }

  showStatus("⏳ Traitement du paiement... Veuillez patienter.", "loading");
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
      console.error('❌ Erreur Stripe:', error);
      showStatus(`❌ Erreur: ${error.message || 'Paiement échoué'}`, "error");
    } else if (paymentIntent) {
      console.log('✓ Paiement réussi:', paymentIntent.status);
      if (paymentIntent.status === 'succeeded') {
        showStatus("✅ Paiement réussi! Redirection...", "success");
        setTimeout(() => {
          window.location.href = `/public/pages/payment-success.html?id=${paymentIntent.id}`;
        }, 1500);
      } else if (paymentIntent.status === 'processing') {
        showStatus("⏳ Paiement en cours de traitement...", "loading");
      }
    }
  } catch (error) {
    console.error('❌ Erreur lors de la confirmation:', error);
    showStatus(`❌ Erreur: ${error.message}`, "error");
  }
}

// ===============================
// Init page
// ===============================
document.addEventListener("DOMContentLoaded", async () => {
  // Footer year
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  loadCartItems();
  renderOrderSummary();
  await initStripePayment();

  const payBtn = document.getElementById("pay-button");
  if (payBtn) {
    payBtn.addEventListener("click", handlePayClick);
  }
});


// Switcher entre méthodes de paiement
document.querySelectorAll(".payment-option-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".payment-option-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const method = btn.dataset.method;
    document.querySelectorAll(".payment-form").forEach(f => f.classList.add("hidden"));
    document.getElementById(`${method}-payment`)?.classList.remove("hidden");
  });
});


