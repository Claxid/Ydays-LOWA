LOWA — Site démo

Ce dépôt contient une version minimale d'une boutique de vêtements éthiques (LOWA).

Fichiers principaux :
- `temp/homepage/homepage.html` — page d'accueil (FR)
- `assets/style/homepage.css` — styles
- `src/script/main.js` — logique client (chargement produits, panier en localStorage)
- `src/database/products.json` — données produits (exemples)

Voir aussi :
- `assets/images/` — place pour les images produits (utilisez vos fichiers ou laissez les placeholders actuels)

Comment tester localement :

1) Depuis la racine du projet, lancer un serveur local simple (recommandé) :

   python -m http.server 8000

2) Ouvrir dans le navigateur :

   http://localhost:8000/temp/homepage/homepage.html

Notes :
- Le site est une démo front-end. Le checkout est factice et n'envoie pas de données.
- Pour la production, ajouter sécurisation, back-end, pages produit détaillées, gestion des stocks et un vrai paiement.

Prochaines étapes recommandées :
- Ajouter des images réelles dans `assets/images/` et corriger les URLs.
- Créer une page panier/commande côté serveur.
- Ajouter tests E2E simples et validation d'accessibilité.
