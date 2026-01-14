CREATE DATABASE IF NOT EXISTS lowa
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE lowa;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;
START TRANSACTION;

-- Utilisateurs
CREATE TABLE IF NOT EXISTS utilisateurs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  mot_de_passe VARCHAR(255) NOT NULL, -- hash (bcrypt)
  adresse TEXT,
  telephone VARCHAR(30),
  date_inscription TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Catégories
CREATE TABLE IF NOT EXISTS categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(150) NOT NULL,
  description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Produits
CREATE TABLE IF NOT EXISTS produits (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(200) NOT NULL,
  description TEXT,
  prix DECIMAL(10,2) NOT NULL CHECK (prix >= 0),
  stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url TEXT,
  id_categorie BIGINT UNSIGNED,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_produits_categorie FOREIGN KEY (id_categorie)
    REFERENCES categories(id) ON UPDATE CASCADE ON DELETE SET NULL,
  INDEX idx_produits_categorie (id_categorie)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Commandes
CREATE TABLE IF NOT EXISTS commandes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  id_utilisateur BIGINT UNSIGNED NOT NULL,
  statut VARCHAR(50) NOT NULL DEFAULT 'en_attente',
  total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
  date_commande TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_commandes_utilisateur FOREIGN KEY (id_utilisateur)
    REFERENCES utilisateurs(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_commandes_utilisateur (id_utilisateur),
  INDEX idx_commandes_statut (statut)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Détails Commande
CREATE TABLE IF NOT EXISTS commande_details (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  id_commande BIGINT UNSIGNED NOT NULL,
  id_produit BIGINT UNSIGNED NOT NULL,
  quantite INT NOT NULL CHECK (quantite > 0),
  prix DECIMAL(10,2) NOT NULL CHECK (prix >= 0),
  CONSTRAINT fk_details_commande FOREIGN KEY (id_commande)
    REFERENCES commandes(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_details_produit FOREIGN KEY (id_produit)
    REFERENCES produits(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_details_commande (id_commande),
  INDEX idx_details_produit (id_produit)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Paiements
CREATE TABLE IF NOT EXISTS paiements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  id_commande BIGINT UNSIGNED NOT NULL,
  montant DECIMAL(10,2) NOT NULL CHECK (montant >= 0),
  mode_paiement VARCHAR(50) NOT NULL,
  statut_paiement VARCHAR(50) NOT NULL DEFAULT 'en_attente',
  date_paiement TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_paiements_commande FOREIGN KEY (id_commande)
    REFERENCES commandes(id) ON UPDATE CASCADE ON DELETE CASCADE,
  INDEX idx_paiements_commande (id_commande),
  INDEX idx_paiements_statut (statut_paiement)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Données de démo
INSERT INTO categories (nom, description) VALUES
  ('Chemises', 'Chemises et blouses'),
  ('Pantalons', 'Pantalons et jeans'),
  ('Accessoires', 'Accessoires mode')
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

INSERT INTO produits (nom, description, prix, stock, image_url, id_categorie) VALUES
  ('Chemise Blanche', 'Chemise en coton blanc premium', 49.99, 20, 'https://via.placeholder.com/600x600?text=Chemise', 1),
  ('Jean Bleu', 'Jean classique bleu denim', 79.99, 15, 'https://via.placeholder.com/600x600?text=Jean', 2),
  ('Ceinture Cuir', 'Ceinture en cuir véritable', 39.99, 30, 'https://via.placeholder.com/600x600?text=Ceinture', 3)
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

-- mot de passe = password123 (bcrypt Laravel default hash)
INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, adresse, telephone) VALUES
  ('Dupont', 'Jean', 'jean@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa5mZ8U4vECohG4kpboh4u5.bBi', '123 rue de Paris, 75000 Paris', '0123456789')
ON DUPLICATE KEY UPDATE email = VALUES(email);

SET FOREIGN_KEY_CHECKS=1;
COMMIT;
