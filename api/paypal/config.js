module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientId = process.env.PAYPAL_CLIENT_ID || '';
  const currency = process.env.PAYPAL_CURRENCY || 'EUR';

  return res.status(200).json({
    ready: Boolean(clientId),
    clientId,
    currency,
    sandbox: (process.env.PAYPAL_MODE || 'sandbox') !== 'live'
  });
};