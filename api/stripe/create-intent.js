/**
 * Créer une intention de paiement Stripe
 * Endpoint: POST /api/stripe/create-intent
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');

module.exports = async function handler(req, res) {
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Gestion CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Vérifier la clé secrète
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === '') {
      console.error('❌ STRIPE_SECRET_KEY non configurée');
      return res.status(500).json({ 
        error: 'STRIPE_SECRET_KEY not configured',
        solution: 'Configurez STRIPE_SECRET_KEY dans les variables d\'environnement Vercel'
      });
    }

    const { amount, currency = 'eur', items = [] } = req.body;

    // Validation montant
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ 
        error: 'Invalid amount',
        details: 'amount must be a positive number'
      });
    }

    console.log('📝 PaymentIntent:', { amount, currency, items: items.length });

    // Créer l'intention de paiement
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // En centimes/unité minimale
      currency: currency.toLowerCase(),
      payment_method_types: ['card'],
      metadata: {
        itemsCount: items.length.toString(),
        itemsNames: items.map(i => i.name).join(', ').substring(0, 500)
      }
    });

    console.log('✓ Intent créée:', paymentIntent.id);

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amount,
      currency: currency,
      status: paymentIntent.status
    });

  } catch (error) {
    console.error('❌ Erreur Stripe:', error.type, error.message);
    
    // Erreur d'authentification
    if (error.type === 'StripeAuthenticationError') {
      return res.status(401).json({
        error: 'Stripe authentication failed',
        message: 'Invalid Stripe API key'
      });
    }

    // Erreur de validation
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        error: error.message,
        message: 'Invalid request parameters'
      });
    }

    // Erreur générale
    return res.status(500).json({
      error: error.message || 'Failed to create payment intent',
      type: error.type || 'unknown'
    });
  }
};
