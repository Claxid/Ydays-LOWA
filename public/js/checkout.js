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
    const savedCart = JSON.parse(localStorage.getItem("cart")) || [];
    cartItems = savedCart;

    cartTotal = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  } catch (e) {
    console.error("Erreur chargement panier", e);
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
    const configRes = await fetch("/api/stripe/config");
    const { publicKey } = await configRes.json();
    stripe = Stripe(publicKey);

    // 2. Création PaymentIntent
    const intentRes = await fetch("/api/stripe/create-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Math.round(cartTotal * 100),
      }),
    });

    const { clientSecret } = await intentRes.json();

    // 3. Elements
    elements = stripe.elements({ clientSecret });

    // 4. Payment Element
    const paymentElement = elements.create("payment");
    paymentElement.mount("#payment-element");

  } catch (error) {
    console.error("Erreur Stripe:", error);
    showStatus("❌ Impossible d'initialiser le paiement", "error");
  }
}

// ===============================
// Paiement
// ===============================
async function handlePayClick() {
  if (!stripe || !elements) return;

  showStatus("Traitement du paiement...", "loading");

  const { error } = await stripe.confirmPayment({
    elements,
    confirmParams: {
      return_url: `${window.location.origin}/success.html`,
    },
  });

  if (error) {
    showStatus(error.message, "error");
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