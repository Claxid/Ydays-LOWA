# 🔧 Guide de Configuration du Paiement - LOWA

## 📋 Table des matières
1. [Configuration Stripe](#configuration-stripe)
2. [Autres méthodes de paiement](#autres-méthodes-de-paiement)
3. [Dépannage](#dépannage)
4. [Variables d'environnement](#variables-denvironnement)

---

## ✅ Configuration Stripe

### Étape 1: Créer un compte Stripe
1. Allez sur [https://dashboard.stripe.com/](https://dashboard.stripe.com/)
2. Cliquez sur "Sign up"
3. Remplissez vos informations (email, mot de passe)
4. Vérifiez votre email

### Étape 2: Récupérer les clés API
1. Dans le Dashboard Stripe, allez dans **Developers** (menu de gauche)
2. Cliquez sur **API keys**
3. Vous verrez deux clés:
   - **Publishable key** (commence par `pk_test_` ou `pk_live_`)
   - **Secret key** (commence par `sk_test_` ou `sk_live_`)

### Étape 3: Configurer les variables d'environnement

#### Pour Vercel (Production/Staging)
1. Allez dans votre projet Vercel
2. Settings > **Environment Variables**
3. Ajoutez:
   ```
   STRIPE_PUBLIC_KEY = pk_test_... (votre clé publique)
   STRIPE_SECRET_KEY = sk_test_... (votre clé secrète)
   ```
4. Sauvegardez et redéployez

#### Pour développement local
1. Créez un fichier `.env.local` à la racine du projet
2. Ajoutez:
   ```
   STRIPE_PUBLIC_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   ```
3. Redémarrez votre serveur de développement

### Étape 4: Tester en mode Sandbox
Utilisez ces numéros de carte pour tester:

**Paiement réussi:**
- Numéro: `4242 4242 4242 4242`
- Expiration: n'importe quelle date future (ex: 12/25)
- CVC: n'importe quel numéro (ex: 123)

**Paiement échoué:**
- Numéro: `4000 0000 0000 0002`

**Authentification requise:**
- Numéro: `4000 0025 0000 3155`

---

## 🎯 Autres méthodes de paiement

### Méthodes actuellement implémentées:
1. **✅ Carte bancaire (Stripe)** - Opérationnel
2. **⏳ PayPal** - Infrastructure en place, nécessite configuration
3. **⏳ Apple Pay** - Infrastructure en place, nécessite configuration
4. **⏳ Google Pay** - Infrastructure en place, nécessite configuration
5. **⏳ Virement bancaire SEPA** - Infrastructure en place

### Solutions de paiement alternatives recommandées:

#### 1. **Adyen** (Recommandé pour PME)
- **Website:** https://www.adyen.com/
- **Avantages:**
  - Plus de 250 méthodes de paiement
  - Support des cartes, portefeuilles, virement bancaire, klarna, etc.
  - Très bon support client
  - Tarifs compétitifs
- **Intégration:** SDK JavaScript fourni
- **Documentation:** https://docs.adyen.com/

#### 2. **Mollie** (Recommandé pour UE)
- **Website:** https://www.mollie.com/
- **Avantages:**
  - Spécialisée en paiement européen
  - Support iDEAL, Bancontact, SEPA, Klarna, PayPal, etc.
  - Très bon pour les petites entreprises
  - API REST simple
- **Intégration:** API REST + SDK
- **Documentation:** https://docs.mollie.com/

#### 3. **Paypal Commerce Platform**
- **Website:** https://www.paypal.com/webapps/commerce/
- **Avantages:**
  - Intégration facile
  - Cartes, portefeuille PayPal, virement bancaire
  - Bon taux de conversion
- **Intégration:** Déjà partiellement intégrée dans votre code
- **Documentation:** https://developer.paypal.com/

#### 4. **Square** (Bon pour retail + online)
- **Website:** https://squareup.com/
- **Avantages:**
  - Excellent pour mélanger online et physique
  - Support cartes, portefeuilles, virement
  - Dashboard très clair
- **Intégration:** Web Payments SDK
- **Documentation:** https://developer.squareup.com/

#### 5. **Klarna** (Pour paiements ultérieurs)
- **Website:** https://www.klarna.com/business/
- **Avantages:**
  - Paiement à la livraison
  - Très populaire en Europe
  - Bonne conversion pour e-commerce
- **Intégration:** Widgets JavaScript
- **Documentation:** https://docs.klarna.com/

#### 6. **2Checkout (Verifone)**
- **Website:** https://www.2checkout.com/
- **Avantages:**
  - Multi-devises
  - Plus de 140 méthodes de paiement
  - International
- **Intégration:** API REST + SDK
- **Documentation:** https://knowledgecenter.2checkout.com/

### Comparaison rapide:
| Plateforme | Cartes | PayPal | Apple/Google | Klarna | Virement | iDEAL | Prix |
|-----------|--------|--------|--------------|--------|----------|-------|------|
| **Stripe** | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | 1.4% + €0.25 |
| **Adyen** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 1.5% + frais |
| **Mollie** | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | 1.8% + frais |
| **PayPal Commerce** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 2.9% + €0.30 |
| **Square** | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | 2.9% + €0.30 |
| **Klarna** | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | 5-10% |

**Recommandation:** Commencez par Stripe (actuellement implémenté), puis ajoutez Adyen ou Mollie pour plus de flexibilité.

---

## 🔍 Dépannage

### Erreur: "STRIPE_PUBLIC_KEY not configured"
**Cause:** La variable d'environnement n'est pas définie

**Solution:**
1. Vérifiez que vous avez ajouté `STRIPE_PUBLIC_KEY` dans vos variables d'environnement
2. Si sur Vercel: Settings > Environment Variables > vérifiez la clé est bien là
3. Si en local: créez `.env.local` avec votre clé

### Erreur: "Failed to load resource: net::ERR_BLOCKED_BY_CLIENT"
**Cause:** Votre navigateur ou extension bloque les requêtes

**Solution:**
1. Désactivez les ad-blockers (uBlock Origin, Adblock Plus, etc.)
2. Désactivez les extensions de sécurité
3. Essayez en mode incognito
4. Utilisez un navigateur différent

### Erreur: "Stripe is not defined"
**Cause:** Le SDK Stripe n'a pas pu charger

**Solution:**
1. Vérifiez votre connexion internet
2. Vérifiez que `STRIPE_PUBLIC_KEY` est valide (commence par `pk_`)
3. Consultez la console pour les erreurs spécifiques

### Panier vide sur la page de paiement
**Cause:** Mauvaise clé de stockage localStorage

**Solution (déjà corrigée):**
- Le code essaie maintenant `lowa_cart` ET `Lowa_cart`
- Ajoutez un produit au panier et réessayez

### Erreur: "amount must be at least $0.50"
**Cause:** Le montant est trop petit (Stripe a un minimum)

**Solution:**
1. Ajoutez plus de produits au panier
2. Le minimum est €0.50 (50 centimes)

---

## 📝 Variables d'environnement

### Stripe (Obligatoire)
```env
# Clés de test (mode sandbox)
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Pour passer en production:
STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
```

### PayPal (Optionnel)
```env
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_MODE=sandbox  # ou 'live'
```

### Adyen (Optionnel - futur)
```env
ADYEN_API_KEY=...
ADYEN_CLIENT_KEY=...
ADYEN_MERCHANT_ACCOUNT=...
```

### Mollie (Optionnel - futur)
```env
MOLLIE_API_KEY=...
MOLLIE_PROFILE_ID=...
```

---

## 🚀 Prochaines étapes

1. **Configurer Stripe** (actuellement implémenté)
   - [ ] Obtenir les clés API
   - [ ] Ajouter les variables d'environnement
   - [ ] Tester avec les numéros de test

2. **Ajouter une deuxième méthode** (recommandé: Adyen ou Mollie)
   - [ ] S'inscrire à la plateforme
   - [ ] Obtenir les clés API
   - [ ] Implémenter l'intégration

3. **Sécurité**
   - [ ] Utiliser HTTPS en production
   - [ ] Activer 3D Secure
   - [ ] Activer les webhooks pour les confirmations

4. **Tests**
   - [ ] Tester avec les numéros fournis
   - [ ] Tester les erreurs
   - [ ] Tester les cas limites

---

## 📞 Support

**Pour Stripe:**
- https://support.stripe.com/
- Dashboard Stripe > Help

**Pour Adyen:**
- https://support.adyen.com/

**Pour Mollie:**
- https://www.mollie.com/en/contact/support

---

**Mis à jour:** Avril 2026
**Version:** 1.0
