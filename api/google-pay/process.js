/**
 * Traiter le paiement Google Pay
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { paymentData, items = [] } = req.body;

    if (!paymentData) {
      return res.status(400).json({ error: 'Invalid payment data' });
    }

    // Générer un ID de commande
    const orderId = 'GP-' + Date.now();
    
    // Calculer le total
    const total = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

    // Créer un paiement Stripe avec le token Google Pay
    try {
      const paymentTokenizationData = paymentData.paymentMethodData.tokenizationData;
      
      const paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: {
          token: paymentTokenizationData.token
        }
      });

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(total * 100),
        currency: 'eur',
        payment_method: paymentMethod.id,
        confirm: true,
        metadata: {
          orderId,
          itemsCount: items.length,
          paymentMethod: 'google_pay'
        }
      });

      if (paymentIntent.status === 'succeeded') {
        return res.status(200).json({
          success: true,
          orderId,
          status: paymentIntent.status
        });
      } else {
        return res.status(400).json({
          success: false,
          error: 'Payment not succeeded: ' + paymentIntent.status
        });
      }
    } catch (stripeError) {
      console.error('Stripe processing error:', stripeError);
      return res.status(400).json({
        success: false,
        error: stripeError.message || 'Failed to process payment'
      });
    }
  } catch (error) {
    console.error('Google Pay error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to process Google Pay'
    });
  }
};
