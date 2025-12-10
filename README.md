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

1) Depuis la racine du projet, lancer le serveur Go inclus :

   ```powershell
   # Lancer sans compiler
   go run main.go

   # Ou construire un exécutable puis le lancer
   go build -o ydays.exe main.go
   .\ydays.exe
   ```

2) Ouvrir dans le navigateur (lien cliquable) :

- [http://localhost:8080/](http://localhost:8080/)

Remarque : vous pouvez changer le dossier servi ou le port :

```powershell
go run main.go --dir ./ --addr :3000
# puis ouvrir http://localhost:3000/
```

Notes :
- Le site est une démo front-end. Le checkout est factice et n'envoie pas de données.
- Pour la production, ajouter sécurisation, back-end, pages produit détaillées, gestion des stocks et un vrai paiement.

Prochaines étapes recommandées :
- Ajouter des images réelles dans `assets/images/` et corriger les URLs.
- Créer une page panier/commande côté serveur.
- Ajouter tests E2E simples et validation d'accessibilité.
