/**
 * Créer une intention de paiement Stripe
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');

module.exports = async function handler(req, res) {
  // Ajouter les headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Vérifier la clé secrète
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY non configurée');
      return res.status(500).json({ 
        error: 'STRIPE_SECRET_KEY not configured in environment variables',
        solution: 'Configurez STRIPE_SECRET_KEY dans vos variables d\'environnement. Voir .env.example'
      });
    }

    const { amount, currency = 'eur', items = [] } = req.body;

    console.log('📝 Création PaymentIntent:', { amount, currency, itemsCount: items.length });

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Créer l'intention de paiement
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Montant en centimes
      currency,
      payment_method_types: ['card'],
      metadata: {
        itemsCount: items.length,
        itemsNames: items.map(i => i.name).join(', ')
      }
    });

    console.log('✓ PaymentIntent créée:', paymentIntent.id);

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount,
      currency
    });
  } catch (error) {
    console.error('❌ Erreur Stripe:', error.message);
    
    // Si c'est une erreur d'authentification Stripe
    if (error.type === 'StripeAuthenticationError') {
      return res.status(500).json({
        error: 'Stripe authentication failed',
        solution: 'Vérifiez votre STRIPE_SECRET_KEY'
      });
    }

    return res.status(500).json({
      error: error.message || 'Failed to create payment intent'
    });
  }
};
