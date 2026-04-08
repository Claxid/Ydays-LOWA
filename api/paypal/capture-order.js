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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const orderID = String(body.orderID || body.orderId || '').trim();

    if (!orderID) {
      return res.status(400).json({ error: 'orderID manquant' });
    }

    const { accessToken, baseUrl } = await getPaypalAccessToken();

    const captureResponse = await fetch(`${baseUrl}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const captureData = await captureResponse.json();
    if (!captureResponse.ok) {
      return res.status(500).json({ error: captureData.message || 'Impossible de capturer le paiement' });
    }

    return res.status(200).json({
      ok: true,
      status: captureData.status,
      captureID: captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id || null,
      raw: captureData
    });
  } catch (error) {
    return res.status(500).json({ error: error && error.message ? error.message : 'Erreur inconnue PayPal' });
  }
};