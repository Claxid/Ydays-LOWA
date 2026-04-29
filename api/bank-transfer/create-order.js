/**
 * Créer une commande en attente de virement bancaire
 */

const crypto = require('crypto');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { items = [] } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }

    // Générer un ID de commande unique
    const orderId = 'BT-' + crypto.randomBytes(8).toString('hex').toUpperCase();
    
    // Calculer le total
    const total = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

    // Ici, vous pouvez sauvegarder la commande en attente dans votre BDD
    // Pour l'instant, on retourne juste l'ID de commande
    
    return res.status(200).json({
      success: true,
      orderId,
      status: 'pending_bank_transfer',
      total,
      bankDetails: {
        accountHolder: 'LOWA SARL',
        iban: 'FR76 XXXX XXXX XXXX XXXX XXXX XXX',
        bic: 'BNAGFRPPXXX',
        reference: orderId
      },
      message: 'Commande créée. Veuillez effectuer le virement avec la référence: ' + orderId
    });
  } catch (error) {
    console.error('Bank transfer error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to create order'
    });
  }
};
