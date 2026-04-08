function paypalGetCartItems() {
  try {
    if (typeof scopedStorageGet === 'function') {
      const scopedRaw = scopedStorageGet('lowa_cart');
      if (scopedRaw) return JSON.parse(scopedRaw) || [];
    }
    const raw = localStorage.getItem('lowa_cart');
    return raw ? JSON.parse(raw) || [] : [];
  } catch (error) {
    return [];
  }
}

function paypalSetStatus(message, type = 'info') {
  const status = document.getElementById('paypal-status');
  if (!status) return;
  status.textContent = message;
  status.dataset.type = type;
}

function paypalFormatPrice(value) {
  const amount = Number(value) || 0;
  return amount.toFixed(2).replace('.', ',');
}

function paypalGetCartTotal(items) {
  return (items || []).reduce((sum, item) => sum + (Number(item.price) || 0), 0);
}

function paypalRenderSummary(items) {
  const list = document.getElementById('order-items');
  const total = document.getElementById('order-total');
  const count = document.getElementById('order-count');

  if (!list || !total || !count) return;

  count.textContent = `${items.length} article${items.length > 1 ? 's' : ''}`;
  total.textContent = `${paypalFormatPrice(paypalGetCartTotal(items))} €`;

  if (!items.length) {
    list.innerHTML = '<div class="empty-state">Votre panier est vide.</div>';
    return;
  }

  list.innerHTML = items.map((item) => `
    <div class="order-item">
      <img src="${item.image || '/public/images/logo.png'}" alt="${item.name || 'Produit'}" />
      <div class="order-item-meta">
        <strong>${item.name || 'Article'}</strong>
        <span>Qté: ${Number(item.quantity || 1)}</span>
      </div>
      <div class="order-item-price">${paypalFormatPrice(item.price)} €</div>
    </div>
  `).join('');
}

async function paypalFetchConfig() {
  const response = await fetch('/api/paypal/config', { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok || !data || !data.clientId) {
    throw new Error((data && data.error) || 'Configuration PayPal manquante');
  }
  return data;
}

function paypalLoadSdk(clientId, currency) {
  return new Promise((resolve, reject) => {
    if (window.paypal) {
      resolve(window.paypal);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency || 'EUR')}&intent=capture&components=buttons`;
    script.onload = () => resolve(window.paypal);
    script.onerror = () => reject(new Error('Impossible de charger le SDK PayPal'));
    document.head.appendChild(script);
  });
}

async function paypalCreateOrder(items) {
  const response = await fetch('/api/paypal/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items })
  });

  const data = await response.json();
  if (!response.ok || !data.orderID) {
    throw new Error((data && data.error) || 'Impossible de créer la commande PayPal');
  }
  return data.orderID;
}

async function paypalCaptureOrder(orderID) {
  const response = await fetch('/api/paypal/capture-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderID })
  });

  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error((data && data.error) || 'Impossible de capturer le paiement');
  }
  return data;
}

function paypalClearCart() {
  try {
    localStorage.removeItem('lowa_cart');
  } catch (error) {}

  if (typeof scopedStorageSet === 'function') {
    scopedStorageSet('lowa_cart', JSON.stringify([]));
  }

  if (typeof lowaWriteUserStatePatch === 'function') {
    lowaWriteUserStatePatch({ cart: [] }).catch(() => {});
  }
}

async function initPaypalCheckout() {
  const items = paypalGetCartItems();
  paypalRenderSummary(items);

  if (!items.length) {
    paypalSetStatus('Votre panier est vide. Retournez aux produits pour ajouter des articles.', 'warning');
    const buttonsWrap = document.getElementById('paypal-buttons');
    if (buttonsWrap) buttonsWrap.innerHTML = '';
    return;
  }

  try {
    paypalSetStatus('Chargement de PayPal...', 'info');
    const config = await paypalFetchConfig();
    const paypal = await paypalLoadSdk(config.clientId, config.currency || 'EUR');

    if (!paypal || !paypal.Buttons) {
      throw new Error('SDK PayPal indisponible');
    }

    const buttonsWrap = document.getElementById('paypal-buttons');
    if (!buttonsWrap) return;

    paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'gold',
        shape: 'pill',
        label: 'paypal',
        height: 48
      },
      createOrder: async () => paypalCreateOrder(items),
      onApprove: async (data) => {
        paypalSetStatus('Paiement en cours de validation...', 'info');
        await paypalCaptureOrder(data.orderID);
        paypalClearCart();
        paypalRenderSummary([]);
        paypalSetStatus('Paiement accepté. Merci pour votre commande.', 'success');
      },
      onError: (error) => {
        paypalSetStatus(error && error.message ? error.message : 'Une erreur est survenue pendant le paiement.', 'error');
      },
      onCancel: () => {
        paypalSetStatus('Paiement annulé.', 'warning');
      }
    }).render('#paypal-buttons');

    paypalSetStatus('Choisissez votre moyen de paiement ci-dessous.', 'success');
  } catch (error) {
    paypalSetStatus(error && error.message ? error.message : 'Impossible d’initialiser PayPal.', 'error');
  }
}

document.addEventListener('DOMContentLoaded', initPaypalCheckout);