# Backend LOWA

API backend en Go avec SQLite pour la boutique LOWA.

## Structure

```
backend/
├── main.go           # Serveur HTTP et API handlers
├── go.mod            # Dépendances Go
├── go.sum            # Checksums des dépendances
├── lowa.db           # Base de données SQLite
└── data/
    └── products.json # Catalogue produits
```

## Démarrage

```bash
cd backend
go run main.go
```

Le serveur démarre sur `http://localhost:8080`

## Endpoints API

### Authentification
- `POST /api/register` - Créer un compte
- `POST /api/login` - Se connecter
- `POST /api/logout` - Se déconnecter
- `GET /api/user` - Obtenir les infos utilisateur

### Panier & Commandes
- `GET /api/cart` - Obtenir le panier
- `POST /api/cart` - Mettre à jour le panier
- `GET /api/purchase-history` - Historique d'achats
- `POST /api/checkout` - Finaliser une commande

### Préférences
- `GET /api/user-preferences` - Lire les préférences
- `POST /api/user-preferences` - Sauvegarder les préférences

### Analytics
- `POST /api/user-activity` - Enregistrer l'activité
- `GET /api/recommendations` - Recommandations personnalisées

## Base de données

SQLite avec les tables :
- `users` - Comptes utilisateurs
- `sessions` - Sessions authentification
- `carts` - Paniers
- `purchase_history` - Historique achats
- `user_preferences` - Préférences utilisateur
- `user_activity` - Activité utilisateur

## Configuration

Variables d'environnement (optionnel) :
- `PORT` - Port du serveur (défaut: 8080)
- `DB_PATH` - Chemin base de données (défaut: ./lowa.db)
