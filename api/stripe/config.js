/**
 * Configuration Stripe
 * Retourne la clé publique Stripe
 */

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const publicKey = process.env.STRIPE_PUBLIC_KEY;
    
    if (!publicKey) {
      throw new Error('STRIPE_PUBLIC_KEY not configured');
    }

    return res.status(200).json({
      publicKey,
      publishable_key: publicKey
    });
  } catch (error) {
    console.error('Stripe config error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to get Stripe configuration'
    });
  }
};
