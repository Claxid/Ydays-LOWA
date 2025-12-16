# Instructions de déploiement Backend

## Mise à jour de la colonne PDP dans Render

La colonne `pdp` (photo de profil) a été ajoutée au code mais doit être appliquée à la base de données existante sur Render.

### Option 1 : Redémarrage automatique (Recommandé)
1. Allez sur [render.com](https://render.com) → Votre service LOWA API
2. Cliquez sur "Manual Deploy" → "Deploy latest commit"
3. Le code `db.Exec("ALTER TABLE users ADD COLUMN pdp TEXT")` s'exécutera automatiquement au démarrage
4. La colonne sera ajoutée si elle n'existe pas déjà (commande sûre, ne causera pas d'erreur si la colonne existe)

### Option 2 : Shell Render (Avancé)
Si vous avez accès au shell Render :
```bash
sqlite3 lowa.db "ALTER TABLE users ADD COLUMN pdp TEXT;"
```

### Vérification
Pour vérifier que la colonne a été ajoutée :
```bash
sqlite3 lowa.db "PRAGMA table_info(users);"
```

Vous devriez voir une ligne avec `pdp | TEXT` dans la sortie.

## Après le déploiement
Une fois le backend mis à jour, les utilisateurs pourront :
1. Cliquer sur leur avatar dans la page de profil
2. Sélectionner une image (max 2MB)
3. L'image sera encodée en base64 et sauvegardée dans la colonne `pdp`
4. L'avatar s'affichera automatiquement à la place des initiales
