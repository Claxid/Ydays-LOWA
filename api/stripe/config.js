/**
 * Configuration Stripe
 * Retourne la clé publique Stripe
 */

module.exports = async function handler(req, res) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const publicKey = process.env.STRIPE_PUBLIC_KEY;
    
    if (!publicKey) {
      console.error('❌ STRIPE_PUBLIC_KEY not configured');
      return res.status(500).json({
        error: 'STRIPE_PUBLIC_KEY not configured',
        solution: 'Vous devez configurer STRIPE_PUBLIC_KEY dans vos variables d\'environnement. Voir .env.example'
      });
    }

    if (!publicKey.startsWith('pk_')) {
      console.error('❌ STRIPE_PUBLIC_KEY has invalid format');
      return res.status(500).json({
        error: 'STRIPE_PUBLIC_KEY has invalid format',
        solution: 'La clé publique Stripe doit commencer par "pk_"'
      });
    }

    console.log('✓ Stripe config servée');

    return res.status(200).json({
      publicKey,
      publishable_key: publicKey,
      configured: true
    });
  } catch (error) {
    console.error('Stripe config error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to get Stripe configuration',
      solution: 'Vérifiez votre configuration des variables d\'environnement'
    });
  }
};
