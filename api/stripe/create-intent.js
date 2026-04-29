/**
 * Créer une intention de paiement Stripe
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, currency = 'eur', items = [] } = req.body;

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

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Stripe error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to create payment intent'
    });
  }
};
