# LOWA — Boutique de vêtements éthiques

Site e-commerce de mode responsable avec backend Go et frontend vanilla JS.

## 📁 Structure du projet

```
Ydays-LOWA/
├── index.html              # Page d'accueil
├── public/                 # Fichiers publics
│   ├── pages/             # Pages HTML
│   │   ├── profile.html   # Profil utilisateur
│   │   ├── favoris.html   # Liste de favoris
│   │   └── product-detail.html # Détail produit
│   ├── css/               # Styles
│   │   └── homepage.css   # Feuille de style principale
│   ├── js/                # Scripts
│   │   └── api-config.js  # Configuration API
│   └── images/            # Images produits (SVG)
├── backend/               # API Go + SQLite
│   ├── main.go           # Serveur et handlers
│   ├── lowa.db           # Base de données
│   ├── data/
│   │   └── products.json # Catalogue produits
│   └── README.md         # Documentation backend
├── docs/                  # Documentation
│   ├── GUIDE_UTILISATION.md
│   └── PERSONALISATION.md
└── README.md             # Ce fichier
```

## 🚀 Démarrage rapide

### Backend (Go)

```powershell
cd backend
go run main.go
```

Le serveur démarre sur http://localhost:8080

### Développement

Ouvrir http://localhost:8080/ dans votre navigateur.

## ✨ Fonctionnalités

- 🛍️ Catalogue de 18 produits éco-responsables
- 🔐 Authentification utilisateur (inscription/connexion)
- 🛒 Panier persistant (localStorage + sync backend)
- ❤️ Système de favoris
- 🎨 3 thèmes (Clair, Crépuscule, Tempéré)
- 📱 Design responsive
- ⚡ Cache intelligent avec timestamps
- 🔍 Recherche et filtres (catégorie, collection)

## 🛠️ Technologies

**Frontend :**
- HTML5 / CSS3 (variables CSS pour thèmes)
- JavaScript vanilla (pas de framework)
- LocalStorage pour cache et préférences

**Backend :**
- Go 1.21+
- SQLite (modernc.org/sqlite)
- CORS activé pour développement

## 📖 Documentation

- [Guide d'utilisation](docs/GUIDE_UTILISATION.md)
- [Personnalisation](docs/PERSONALISATION.md)
- [Backend API](backend/README.md)

## 🎯 Prochaines étapes

- [ ] Tests E2E avec Playwright
- [ ] CI/CD avec GitHub Actions
- [ ] Pagination produits
- [ ] Toast notifications
- [ ] PWA support
- [ ] Amélioration accessibilité (WCAG AA)
