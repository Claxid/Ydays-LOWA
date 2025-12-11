# 🌿 LOWA - Guide d'utilisation

## 📋 Table des matières
1. [Démarrage du serveur](#démarrage-du-serveur)
2. [Accès à la base de données](#accès-à-la-base-de-données)
3. [Fonctionnalités du site](#fonctionnalités-du-site)
4. [Résolution de problèmes](#résolution-de-problèmes)

---

## 🚀 Démarrage du serveur

### Option 1 : Utiliser l'exécutable (Recommandé)
```powershell
cd "c:\Users\Clément\OneDrive\Bureau\Ydays\Ydays-LOWA"
.\server.exe
```

### Option 2 : Compiler puis exécuter
```powershell
cd "c:\Users\Clément\OneDrive\Bureau\Ydays\Ydays-LOWA"
go build -o server.exe main.go
.\server.exe
```

Le serveur démarre sur : **http://localhost:8080/**

---

## 💾 Accès à la base de données

### Emplacement
Votre base de données est dans le fichier : `data.json`

**Chemin complet :**
```
c:\Users\Clément\OneDrive\Bureau\Ydays\Ydays-LOWA\data.json
```

### Structure de la base de données

```json
{
  "users": {
    "1": {
      "id": 1,
      "email": "user@example.com",
      "nom": "Doe",
      "prenom": "John",
      "sexe": "H",
      "date_creation": "2025-12-11T15:25:16.123456789+01:00"
    }
  },
  "carts": {
    "1": [
      {
        "product_id": 1,
        "quantity": 2
      }
    ]
  },
  "history": {
    "1": [
      {
        "id": 1,
        "date": "2025-12-11T15:30:00.123456789+01:00",
        "total": 58.00,
        "items": [...]
      }
    ]
  },
  "sessions": {
    "tok_1_1702301116123456789": 1
  },
  "next_id": 2
}
```

### Comment consulter la base de données

#### 1. **Avec VS Code**
- Ouvrez le fichier `data.json` directement dans VS Code
- Format JSON lisible automatiquement

#### 2. **Avec Notepad++**
- Ouvrez le fichier avec Notepad++
- Plugin "JSON Viewer" pour une meilleure visualisation

#### 3. **Avec PowerShell**
```powershell
Get-Content data.json | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

#### 4. **Avec un navigateur web**
Créez un endpoint pour visualiser les données (à ajouter dans `main.go`) :
```go
http.HandleFunc("/api/admin/data", func(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    dataMu.RLock()
    json.NewEncoder(w).Encode(data)
    dataMu.RUnlock()
})
```

Puis accédez à : `http://localhost:8080/api/admin/data`

---

## 🎯 Fonctionnalités du site

### 1. **Système de Cookies** 🍪
- Bannière de consentement apparaît à la première visite
- Options : Accepter / Refuser
- Stockage dans `localStorage` avec clé : `lowa_cookie_consent`
- Si utilisateur connecté, les préférences sont liées à son compte

**Pour réinitialiser les cookies :**
1. Ouvrez la console du navigateur (F12)
2. Tapez : `localStorage.removeItem('lowa_cookie_consent')`
3. Rechargez la page

### 2. **Authentification Utilisateur** 👤

#### Créer un compte :
1. Cliquez sur l'icône utilisateur (👤) en haut à droite
2. Cliquez sur "Inscription"
3. Remplissez le formulaire :
   - Email
   - Nom
   - Prénom
   - Sexe
   - Mot de passe
4. Cliquez sur "Créer un compte"

#### Se connecter :
1. Cliquez sur l'icône utilisateur (👤)
2. Cliquez sur "Connexion"
3. Entrez votre email et mot de passe
4. Cliquez sur "Se connecter"

#### Une fois connecté :
- Votre nom s'affiche en haut à droite
- Votre panier se synchronise avec la base de données
- Votre historique d'achats est sauvegardé

### 3. **Panier d'achats** 🛒
- **Sans compte** : Panier stocké dans `localStorage`
- **Avec compte** : Panier synchronisé avec la base de données

### 4. **Filtres de produits** 🔍
- Filtrer par catégorie (Femmes/Hommes)
- Filtrer par sous-catégorie (Tops, Robes, T-shirts, etc.)
- Filtrer par collection (Éco, Recyclé, Classiques)
- Recherche par nom/description

---

## 🔧 Résolution de problèmes

### Problème : Le serveur ne démarre pas
**Solution :**
```powershell
# Vérifier si un processus utilise déjà le port 8080
Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue

# Si oui, le tuer
Stop-Process -Id (Get-NetTCPConnection -LocalPort 8080).OwningProcess

# Relancer le serveur
.\server.exe
```

### Problème : La bannière de cookies ne s'affiche pas
**Solutions :**
1. Effacez le localStorage :
```javascript
// Dans la console du navigateur (F12)
localStorage.clear();
location.reload();
```

2. Vérifiez que le CSS est bien chargé :
```javascript
// Dans la console
console.log(document.querySelector('.cookie-banner'));
```

### Problème : Impossible de se connecter
**Solutions :**
1. Vérifiez que le serveur est démarré
2. Ouvrez la console du navigateur (F12) pour voir les erreurs
3. Vérifiez le fichier `data.json` pour voir si l'utilisateur existe
4. Le mot de passe est hashé (SHA256), vous ne pouvez pas le lire directement

### Problème : Le menu utilisateur ne s'ouvre pas
**Solution :**
1. Vérifiez dans la console (F12) s'il y a des erreurs JavaScript
2. Effacez le cache du navigateur (Ctrl+F5)
3. Vérifiez que `homepage.css` est bien chargé

### Problème : Les modales (login/register) ne s'affichent pas
**Solution :**
Le CSS des modales utilise `aria-hidden`. Vérifiez que le CSS contient :
```css
.modal[aria-hidden="false"]{
  opacity:1;
  pointer-events:auto;
}
```

---

## 📊 API Endpoints disponibles

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/register` | POST | Créer un compte |
| `/api/login` | POST | Se connecter |
| `/api/user` | GET | Récupérer profil utilisateur |
| `/api/cart` | GET | Récupérer le panier |
| `/api/cart` | POST | Mettre à jour le panier |
| `/api/purchase-history` | GET | Historique d'achats |
| `/api/checkout` | POST | Valider une commande |
| `/api/logout` | POST | Se déconnecter |

### Exemple d'utilisation avec curl :

#### Créer un compte :
```powershell
$body = @{
    email = "test@example.com"
    password = "monpassword"
    nom = "Dupont"
    prenom = "Marie"
    sexe = "F"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8080/api/register" -Method POST -Body $body -ContentType "application/json"
```

#### Se connecter :
```powershell
$body = @{
    email = "test@example.com"
    password = "monpassword"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:8080/api/login" -Method POST -Body $body -ContentType "application/json"
$token = $response.token
```

---

## 🚀 Déploiement sur Vercel

### Prérequis :
1. Compte Vercel
2. Vercel CLI installé : `npm install -g vercel`

### Étapes :
```powershell
# Dans le dossier du projet
vercel login
vercel
```

**Note importante :** 
- Le fichier `data.json` ne persiste pas sur Vercel (serveurs serverless)
- Pour la production, utilisez une vraie base de données comme :
  - **Vercel Postgres**
  - **MongoDB Atlas**
  - **Supabase**
  - **PlanetScale**

---

## 📞 Support

Si vous avez des questions ou des problèmes :
1. Consultez ce guide
2. Vérifiez les logs du serveur dans le terminal
3. Vérifiez la console du navigateur (F12)
4. Vérifiez le fichier `data.json`

---

**Version :** 1.0  
**Dernière mise à jour :** 11 décembre 2025
