# 🚀 Configuration Supabase pour LOWA

## ✅ Étapes complétées dans le code

1. ✅ Librairie Supabase ajoutée dans `index.html`
2. ✅ Configuration Supabase dans `common.js`
3. ✅ Migration du chargement des produits vers Supabase dans `products.js`

---

## 📝 IMPORTANT: Configurez vos clés Supabase

### Étape 1: Récupérer vos clés

1. Allez dans votre dashboard Supabase
2. Cliquez sur **Settings** (⚙️ en bas à gauche)
3. Cliquez sur **API**
4. Copiez:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Anon key**: `eyJxxxxxxx...`

### Étape 2: Modifier `common.js`

Ouvrez `/public/js/common.js` et remplacez les lignes 7-8:

```javascript
const LOWA = {
  SUPABASE: {
    URL: 'YOUR_SUPABASE_URL',      // ⬅️ Collez votre Project URL ici
    ANON_KEY: 'YOUR_SUPABASE_ANON_KEY', // ⬅️ Collez votre Anon Key ici
    client: null
  },
```

Par exemple:
```javascript
const LOWA = {
  SUPABASE: {
    URL: 'https://eslvxznzuioygnnszt0y.supabase.co',
    ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...',
    client: null
  },
```

---

## 🔒 Ajouter les Policies (CRITIQUE!)

### Pourquoi?
Supabase bloque toutes les requêtes par défaut pour sécurité.
Vous DEVEZ créer des policies pour autoriser la lecture des produits.

### Comment ajouter la policy:

1. Dans votre dashboard Supabase, allez sur **Authentication** → **Policies**
2. Cliquez sur **New Policy**
3. Sélectionnez la table `public.products`
4. Cliquez sur le template **"Enable read access for all users"** (SELECT en vert)
5. Cliquez **Review** puis **Save policy**

**OU avec SQL:**

Allez dans **SQL Editor** et collez:

```sql
-- Autoriser la lecture des produits à tous (même non-connectés)
CREATE POLICY "Enable read access for all users" 
ON public.products
FOR SELECT 
USING (true);
```

Puis cliquez **Run** ▶️

---

## 🗄️ Créer les tables (si pas déjà fait)

Dans **SQL Editor**, collez et exécutez:

```sql
-- Products table
CREATE TABLE IF NOT EXISTS products (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2),
  image TEXT,
  category TEXT,
  subcategory TEXT,
  collection TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Users table (pour l'authentification)
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  email TEXT UNIQUE NOT NULL,
  prenom TEXT,
  nom TEXT,
  sexe TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT REFERENCES users(id),
  total DECIMAL(10, 2),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  order_id BIGINT REFERENCES orders(id),
  product_id BIGINT REFERENCES products(id),
  quantity INT,
  price DECIMAL(10, 2)
);
```

---

## 🛍️ Insérer les 18 produits

Dans **SQL Editor**, collez et exécutez:

```sql
INSERT INTO products (name, description, price, image, category, subcategory, collection) VALUES
('T-shirt BIO - Naturel', 'T-shirt en coton biologique certifié. Coupe confortable, coloris naturels.', 29.00, '/public/images/tshirt-naturel.svg', 'hommes', 't-shirts', 'eco'),
('Pull recyclé - Gris', 'Pull fabriqué à partir de fibres recyclées. Chaud et durable.', 79.00, '/public/images/pull-gris.svg', 'hommes', 'vestes', 'recycle'),
('Pantalon éco - Kaki', 'Pantalon en tissu certifié avec renforts minimalistes.', 59.00, '/public/images/pantalon-kaki.svg', 'hommes', 'pantalons', 'eco'),
('Veste en Lin - Beige', 'Veste légère en lin naturel, parfaite pour la mi-saison. Coupe ajustée.', 89.00, '/public/images/veste-lin-beige.svg', 'femmes', 'vestes', 'classiques'),
('Robe d''été - Blanc cassé', 'Robe fluide en coton bio, idéale pour l''été. Fabrication locale.', 65.00, '/public/images/robe-ete.svg', 'femmes', 'robes', 'eco'),
('Top en fibres recyclées - Rose', 'Top féminin fabriqué à partir de bouteilles plastiques recyclées.', 35.00, '/public/images/top-rose.svg', 'femmes', 'tops', 'recycle'),
('Jupe midi - Marine', 'Jupe mi-longue en coton bio certifié GOTS. Coupe élégante.', 55.00, '/public/images/jupe-marine.svg', 'femmes', 'robes', 'classiques'),
('Chemise lin - Blanc', 'Chemise intemporelle en lin français. Production éthique.', 49.00, '/public/images/chemise-lin.svg', 'hommes', 't-shirts', 'classiques'),
('Sac en toile recyclée - Noir', 'Sac cabas en toile recyclée, résistant et pratique au quotidien.', 25.00, '/public/images/sac-recyc.svg', 'femmes', 'accessoires', 'recycle'),
('Écharpe en laine bio - Camel', 'Écharpe douce en laine biologique. Teinture végétale.', 39.00, '/public/images/echarpe.svg', 'femmes', 'accessoires', 'eco'),
('Pantalon chino - Sable', 'Chino en coton bio, coupe moderne et confortable.', 69.00, '/public/images/chino-sable.svg', 'hommes', 'pantalons', 'classiques'),
('Blouson recyclé - Bleu nuit', 'Blouson fabriqué à partir de fibres recyclées. Design urbain.', 95.00, '/public/images/blouson-bleu.svg', 'hommes', 'vestes', 'recycle'),
('Sweat organique - Écru', 'Sweat doux en coton organique, intérieur gratté, coupe unisexe.', 59.00, '/public/images/pull-gris.svg', 'hommes', 't-shirts', 'eco'),
('Parka imperméable recyclée', 'Parka longue, membrane recyclée, coutures étanchées, capuche ajustable.', 129.00, '/public/images/blouson-bleu.svg', 'femmes', 'vestes', 'recycle'),
('Cardigan laine bio - Olive', 'Cardigan en laine biologique, maille perlée, boutons en corozo.', 72.00, '/public/images/veste-lin-beige.svg', 'femmes', 'vestes', 'classiques'),
('Short en coton bio - Sable', 'Short léger en sergé de coton bio, taille ajustable, poches latérales.', 39.00, '/public/images/chino-sable.svg', 'hommes', 'pantalons', 'eco'),
('Robe cache-cœur - Terracotta', 'Robe cache-cœur en viscose EcoVero, ceinture à nouer, manches 3/4.', 79.00, '/public/images/robe-ete.svg', 'femmes', 'robes', 'classiques'),
('Doudoune légère recyclée', 'Doudoune compressible en fibres recyclées, chaleur 4 saisons.', 139.00, '/public/images/blouson-bleu.svg', 'hommes', 'vestes', 'recycle')
ON CONFLICT DO NOTHING;
```

---

## ✅ Checklist finale

- [ ] Créé projet Supabase
- [ ] Copié Project URL et Anon Key
- [ ] Modifié `common.js` avec les bonnes clés
- [ ] Créé les tables (products, users, orders, order_items)
- [ ] Inséré les 18 produits
- [ ] Créé la policy "Enable read access" pour la table products
- [ ] Testé le site (F5) → Les produits devraient s'afficher depuis Supabase!

---

## 🧪 Tester

1. Ouvrez `index.html` dans le navigateur
2. Ouvrez la Console (F12)
3. Vous devriez voir:
   ```
   ✅ Supabase client initialized
   🌐 Fetching products from Supabase...
   ✅ Supabase returned 18 products
   ```

Si vous voyez `⚠️ Supabase failed`, vérifiez:
1. Les clés dans `common.js` sont correctes
2. La policy a bien été créée
3. Les produits sont dans la table

---

## 🆘 Besoin d'aide?

Si ça ne marche pas, ouvrez la Console (F12) et envoyez-moi l'erreur exacte!
