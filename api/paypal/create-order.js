async function getPaypalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const mode = (process.env.PAYPAL_MODE || 'sandbox').toLowerCase();
  const baseUrl = mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

  if (!clientId || !clientSecret) {
    throw new Error('Variables PayPal manquantes. Définissez PAYPAL_CLIENT_ID et PAYPAL_CLIENT_SECRET.');
  }

  const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenData.access_token) {
    throw new Error(tokenData.error_description || tokenData.error || 'Impossible d’obtenir le token PayPal');
  }

  return { accessToken: tokenData.access_token, baseUrl };
}

function normalizeItems(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const unitAmount = Number(item.price);
      const name = String(item.name || 'Article').slice(0, 127);

      if (!Number.isFinite(unitAmount) || unitAmount <= 0) return null;

      return {
        name,
        unit_amount: unitAmount,
        quantity,
        image: item.image || null,
        id: item.id || null
      };
    })
    .filter(Boolean);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const items = normalizeItems(body.items);
    const currency = process.env.PAYPAL_CURRENCY || 'EUR';

    if (!items.length) {
      return res.status(400).json({ error: 'Panier vide ou invalide' });
    }

    const total = items.reduce((sum, item) => sum + (item.unit_amount * item.quantity), 0);
    const amountValue = total.toFixed(2);

    const { accessToken, baseUrl } = await getPaypalAccessToken();

    const orderResponse = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: amountValue,
              breakdown: {
                item_total: {
                  currency_code: currency,
                  value: amountValue
                }
              }
            },
            items: items.map((item) => ({
              name: item.name,
              unit_amount: {
                currency_code: currency,
                value: item.unit_amount.toFixed(2)
              },
              quantity: String(item.quantity),
              category: 'PHYSICAL_GOODS'
            }))
          }
        ],
        application_context: {
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW',
          landing_page: 'LOGIN'
        }
      })
    });

    const orderData = await orderResponse.json();
    if (!orderResponse.ok || !orderData.id) {
      return res.status(500).json({ error: orderData.message || 'Impossible de créer la commande PayPal' });
    }

    return res.status(200).json({
      orderID: orderData.id,
      status: orderData.status,
      total: amountValue,
      currency
    });
  } catch (error) {
    return res.status(500).json({ error: error && error.message ? error.message : 'Erreur inconnue PayPal' });
  }
};