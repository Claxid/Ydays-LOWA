package main

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

type User struct {
	ID           int       `json:"id"`
	Email        string    `json:"email"`
	Nom          string    `json:"nom"`
	Prenom       string    `json:"prenom"`
	Sexe         string    `json:"sexe"`
	Role         string    `json:"role"`
	PDP          string    `json:"pdp"`
	DateCreation time.Time `json:"date_creation"`
}

type CartItem struct {
	ProductID int `json:"product_id"`
	Quantity  int `json:"quantity"`
}

type PurchaseHistory struct {
	ID    int        `json:"id"`
	Date  time.Time  `json:"date"`
	Total float64    `json:"total"`
	Items []CartItem `json:"items"`
}

type RegisterRequest struct {
	Email    string `json:"email"`
	Nom      string `json:"nom"`
	Prenom   string `json:"prenom"`
	Sexe     string `json:"sexe"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type Product struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	Price       float64   `json:"price"`
	Description string    `json:"description"`
	Image       string    `json:"image"`
	Category    string    `json:"category"`
	Subcategory string    `json:"subcategory"`
	Collection  string    `json:"collection"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

var db *sql.DB

func initDB() error {
	var err error
	db, err = sql.Open("sqlite", "./lowa.db")
	if err != nil {
		return err
	}

	// Test connection
	if err = db.Ping(); err != nil {
		return err
	}

	// Create users table
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			nom TEXT NOT NULL,
			prenom TEXT NOT NULL,
			sexe TEXT,
			role TEXT DEFAULT 'user',
			date_creation DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		return err
	}

	// Ensure 'role' column exists for older databases
	db.Exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'")

	// Ensure 'pdp' column exists for profile pictures
	db.Exec("ALTER TABLE users ADD COLUMN pdp TEXT")

	// Create carts table
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS carts (
			user_id INTEGER PRIMARY KEY,
			items TEXT,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)
	`)
	if err != nil {
		return err
	}

	// Create purchase_history table
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS purchase_history (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
			total REAL NOT NULL,
			items TEXT,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)
	`)
	if err != nil {
		return err
	}

	// Create sessions table
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS sessions (
			token TEXT PRIMARY KEY,
			user_id INTEGER NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			expires_at DATETIME NOT NULL,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)
	`)
	if err != nil {
		return err
	}

	// Create user_preferences table
	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS user_preferences (
		user_id INTEGER PRIMARY KEY,
		cookie_consent TEXT,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	)`)
	if err != nil {
		return err
	}

	// Create user_activity table for tracking page visits and browsing history
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS user_activity (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			page TEXT,
			viewed_products TEXT,
			cart_value REAL,
			activity_date DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)
	`)
	if err != nil {
		return err
	}

	// Create products table
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS products (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			price REAL NOT NULL,
			description TEXT,
			image TEXT,
			category TEXT,
			subcategory TEXT,
			collection TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		return err
	}

	log.Println("✓ Database initialized successfully (lowa.db)")
	return nil
}

func hashPassword(password string) string {
	hash := sha256.Sum256([]byte(password))
	return hex.EncodeToString(hash[:])
}

func getSessionUserID(r *http.Request) (int, error) {
	token := r.Header.Get("Authorization")
	if token == "" {
		return 0, fmt.Errorf("no session")
	}

	var userID int
	var expiresAt time.Time
	err := db.QueryRow("SELECT user_id, expires_at FROM sessions WHERE token = ?", token).Scan(&userID, &expiresAt)
	if err != nil {
		return 0, fmt.Errorf("invalid session")
	}

	if expiresAt.Before(time.Now()) {
		db.Exec("DELETE FROM sessions WHERE token = ?", token)
		return 0, fmt.Errorf("session expired")
	}

	return userID, nil
}

func createSession(userID int) string {
	// Clean expired sessions
	db.Exec("DELETE FROM sessions WHERE expires_at < datetime('now')")

	token := fmt.Sprintf("tok_%d_%d", userID, time.Now().UnixNano())
	expiresAt := time.Now().Add(30 * 24 * time.Hour) // 30 days

	db.Exec("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
		token, userID, expiresAt)

	return token
}

// Add CORS headers to response
func setCORSHeaders(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

// Wrap handlers to inject CORS headers and handle preflight
func withCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setCORSHeaders(w)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next(w, r)
	}
}

// API Endpoints
func handleRegister(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
		return
	}

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
		return
	}

	if req.Email == "" || req.Password == "" || req.Nom == "" || req.Prenom == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Missing required fields"})
		return
	}

	passwordHash := hashPassword(req.Password)
	result, err := db.Exec(
		"INSERT INTO users (email, password_hash, nom, prenom, sexe) VALUES (?, ?, ?, ?, ?)",
		req.Email, passwordHash, req.Nom, req.Prenom, req.Sexe,
	)

	if err != nil {
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]string{"error": "Email already exists"})
		return
	}

	userID, _ := result.LastInsertId()

	// Create empty cart for user
	db.Exec("INSERT INTO carts (user_id, items) VALUES (?, ?)", userID, "[]")

	token := createSession(int(userID))

	log.Printf("New user registered: %s (ID: %d)", req.Email, userID)

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"user_id": userID,
		"token":   token,
	})
}

func handleLogin(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
		return
	}

	passwordHash := hashPassword(req.Password)
	var user User
	var storedHash string

	err := db.QueryRow(
		"SELECT id, email, nom, prenom, sexe, role, date_creation, password_hash FROM users WHERE email = $1",
		req.Email,
	).Scan(&user.ID, &user.Email, &user.Nom, &user.Prenom, &user.Sexe, &user.Role, &user.DateCreation, &storedHash)

	if err != nil || storedHash != passwordHash {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid credentials"})
		return
	}

	token := createSession(user.ID)
	log.Printf("User logged in: %s (ID: %d)", user.Email, user.ID)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"user":    user,
		"token":   token,
	})
}

func handleGetUser(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID, err := getSessionUserID(r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Not authenticated"})
		return
	}

	var user User
	err = db.QueryRow(
		"SELECT id, email, nom, prenom, sexe, role, pdp, date_creation FROM users WHERE id = ?",
		userID,
	).Scan(&user.ID, &user.Email, &user.Nom, &user.Prenom, &user.Sexe, &user.Role, &user.PDP, &user.DateCreation)

	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "User not found"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(user)
}

func handleUpdateUser(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID, err := getSessionUserID(r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Not authenticated"})
		return
	}

	var updateData struct {
		PDP string `json:"pdp"`
	}
	if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
		return
	}

	// Update user profile picture
	_, err = db.Exec("UPDATE users SET pdp = ? WHERE id = ?", updateData.PDP, userID)
	if err != nil {
		log.Printf("Error updating user PDP: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update profile"})
		return
	}

	// Return updated user
	var user User
	err = db.QueryRow(
		"SELECT id, email, nom, prenom, sexe, role, pdp, date_creation FROM users WHERE id = ?",
		userID,
	).Scan(&user.ID, &user.Email, &user.Nom, &user.Prenom, &user.Sexe, &user.Role, &user.PDP, &user.DateCreation)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch updated user"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(user)
}

func handleUpdateCart(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID, err := getSessionUserID(r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Not authenticated"})
		return
	}

	var items []CartItem
	if err := json.NewDecoder(r.Body).Decode(&items); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
		return
	}

	itemsJSON, _ := json.Marshal(items)
	_, err = db.Exec(
		"INSERT OR REPLACE INTO carts (user_id, items, updated_at) VALUES (?, ?, datetime('now'))",
		userID, string(itemsJSON),
	)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update cart"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"success": "true"})
}

func handleGetCart(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID, err := getSessionUserID(r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Not authenticated"})
		return
	}

	var itemsJSON string
	err = db.QueryRow("SELECT items FROM carts WHERE user_id = ?", userID).Scan(&itemsJSON)

	if err != nil {
		// No cart yet, return empty array
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode([]CartItem{})
		return
	}

	var items []CartItem
	json.Unmarshal([]byte(itemsJSON), &items)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(items)
}

func handleGetPurchaseHistory(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID, err := getSessionUserID(r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Not authenticated"})
		return
	}

	rows, err := db.Query(
		"SELECT id, purchase_date, total, items FROM purchase_history WHERE user_id = ? ORDER BY purchase_date DESC",
		userID,
	)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch history"})
		return
	}
	defer rows.Close()

	var history []PurchaseHistory
	for rows.Next() {
		var p PurchaseHistory
		var itemsJSON string
		rows.Scan(&p.ID, &p.Date, &p.Total, &itemsJSON)
		json.Unmarshal([]byte(itemsJSON), &p.Items)
		history = append(history, p)
	}

	if history == nil {
		history = []PurchaseHistory{}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(history)
}

func handleCheckout(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID, err := getSessionUserID(r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Not authenticated"})
		return
	}

	var checkoutData struct {
		Items []CartItem `json:"items"`
		Total float64    `json:"total"`
	}

	if err := json.NewDecoder(r.Body).Decode(&checkoutData); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
		return
	}

	itemsJSON, _ := json.Marshal(checkoutData.Items)
	_, err = db.Exec(
		"INSERT INTO purchase_history (user_id, total, items) VALUES (?, ?, ?)",
		userID, checkoutData.Total, string(itemsJSON),
	)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to process purchase"})
		return
	}

	// Clear cart after checkout
	db.Exec("UPDATE carts SET items = '[]', updated_at = datetime('now') WHERE user_id = ?", userID)

	log.Printf("Purchase completed for user ID: %d (Total: %.2f EUR)", userID, checkoutData.Total)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Purchase completed",
	})
}

func handleLogout(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	token := r.Header.Get("Authorization")

	if token != "" {
		db.Exec("DELETE FROM sessions WHERE token = ?", token)
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"success": "true"})
}

func handleUserPreferences(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
		return
	}

	userID, err := getSessionUserID(r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Not authenticated"})
		return
	}

	var body struct {
		CookieConsent string `json:"cookie_consent"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.CookieConsent == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
		return
	}

	// Create table for preferences if not exists
	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS user_preferences (
		user_id INTEGER PRIMARY KEY,
		cookie_consent TEXT,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	)`)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to prepare table"})
		return
	}

	// Upsert preference
	_, err = db.Exec(`INSERT INTO user_preferences (user_id, cookie_consent, updated_at)
		VALUES (?, ?, datetime('now'))
		ON CONFLICT(user_id) DO UPDATE SET cookie_consent = excluded.cookie_consent, updated_at = excluded.updated_at`,
		userID, body.CookieConsent,
	)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to save preferences"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"success": "true"})
}

// Track user activity for recommendations
func handleUserActivity(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
		return
	}

	userID, err := getSessionUserID(r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Not authenticated"})
		return
	}

	var body struct {
		Page           string   `json:"page"`
		ViewedProducts []string `json:"viewed_products"`
		CartValue      float64  `json:"cart_value"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
		return
	}

	// Convert viewed products to JSON string
	viewedJSON, _ := json.Marshal(body.ViewedProducts)

	// Insert activity record
	_, err = db.Exec(
		`INSERT INTO user_activity (user_id, page, viewed_products, cart_value)
		VALUES (?, ?, ?, ?)`,
		userID, body.Page, string(viewedJSON), body.CartValue,
	)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to track activity"})
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"success": "true"})
}

// Get recommendations based on user activity
func handleGetRecommendations(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
		return
	}

	userID, err := getSessionUserID(r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Not authenticated"})
		return
	}

	// Fetch user's recent activity to find patterns
	rows, err := db.Query(
		`SELECT viewed_products FROM user_activity WHERE user_id = ? ORDER BY activity_date DESC LIMIT 10`,
		userID,
	)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch recommendations"})
		return
	}
	defer rows.Close()

	// Simple recommendation: return recently viewed product IDs
	type RecommendationResponse struct {
		RecentlyViewed []string `json:"recently_viewed"`
		Message        string   `json:"message"`
	}

	var recentlyViewed []string
	for rows.Next() {
		var productsJSON string
		if err := rows.Scan(&productsJSON); err != nil {
			continue
		}
		var products []string
		json.Unmarshal([]byte(productsJSON), &products)
		for _, p := range products {
			// Avoid duplicates
			found := false
			for _, rv := range recentlyViewed {
				if rv == p {
					found = true
					break
				}
			}
			if !found {
				recentlyViewed = append(recentlyViewed, p)
			}
		}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(RecommendationResponse{
		RecentlyViewed: recentlyViewed,
		Message:        "Produits recommandés basés sur votre historique",
	})
}

// Helper function to check if user is admin
func isAdmin(r *http.Request) (int, bool) {
	userID, err := getSessionUserID(r)
	if err != nil {
		return 0, false
	}

	var role string
	err = db.QueryRow("SELECT role FROM users WHERE id = ?", userID).Scan(&role)
	if err != nil || role != "admin" {
		return userID, false
	}
	return userID, true
}

// Get all products
func handleGetProducts(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	rows, err := db.Query(`
		SELECT id, name, price, description, image, category, subcategory, collection, created_at, updated_at 
		FROM products 
		ORDER BY created_at DESC
	`)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch products"})
		return
	}
	defer rows.Close()

	products := []Product{}
	for rows.Next() {
		var p Product
		err := rows.Scan(&p.ID, &p.Name, &p.Price, &p.Description, &p.Image, &p.Category, &p.Subcategory, &p.Collection, &p.CreatedAt, &p.UpdatedAt)
		if err != nil {
			continue
		}
		products = append(products, p)
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(products)
}

// Create product (admin only)
func handleCreateProduct(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	_, admin := isAdmin(r)
	if !admin {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Admin access required"})
		return
	}

	var product Product
	if err := json.NewDecoder(r.Body).Decode(&product); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
		return
	}

	result, err := db.Exec(`
		INSERT INTO products (name, price, description, image, category, subcategory, collection) 
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, product.Name, product.Price, product.Description, product.Image, product.Category, product.Subcategory, product.Collection)

	if err != nil {
		log.Printf("Error creating product: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create product"})
		return
	}

	productID, _ := result.LastInsertId()
	product.ID = int(productID)

	log.Printf("Product created: %s (ID: %d)", product.Name, productID)

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(product)
}

// Update product (admin only)
func handleUpdateProduct(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	_, admin := isAdmin(r)
	if !admin {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Admin access required"})
		return
	}

	var product Product
	if err := json.NewDecoder(r.Body).Decode(&product); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
		return
	}

	_, err := db.Exec(`
		UPDATE products 
		SET name = ?, price = ?, description = ?, image = ?, category = ?, subcategory = ?, collection = ?, updated_at = CURRENT_TIMESTAMP 
		WHERE id = ?
	`, product.Name, product.Price, product.Description, product.Image, product.Category, product.Subcategory, product.Collection, product.ID)

	if err != nil {
		log.Printf("Error updating product: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update product"})
		return
	}

	log.Printf("Product updated: %s (ID: %d)", product.Name, product.ID)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(product)
}

// Delete product (admin only)
func handleDeleteProduct(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	_, admin := isAdmin(r)
	if !admin {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Admin access required"})
		return
	}

	// Get product ID from query parameter
	productID := r.URL.Query().Get("id")
	if productID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Product ID required"})
		return
	}

	_, err := db.Exec("DELETE FROM products WHERE id = ?", productID)
	if err != nil {
		log.Printf("Error deleting product: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to delete product"})
		return
	}

	log.Printf("Product deleted: ID %s", productID)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"success": "Product deleted"})
}

func main() {
	addr := flag.String("addr", ":8080", "address to listen on")
	flag.Parse()

	// If PORT env is set (Render/Fly/etc.), override addr
	if portEnv := os.Getenv("PORT"); portEnv != "" {
		if strings.HasPrefix(portEnv, ":") {
			*addr = portEnv
		} else {
			*addr = ":" + portEnv
		}
	}

	// Initialize database
	if err := initDB(); err != nil {
		log.Fatal("❌ Database initialization failed:", err)
	}
	defer db.Close()

	// Middleware to add cache headers
	cacheMiddleware := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Cache static assets for 30 days
			if strings.HasPrefix(r.URL.Path, "/assets/") {
				w.Header().Set("Cache-Control", "public, max-age=2592000, immutable")
			}
			// Cache HTML/JSON API responses for 1 hour
			if strings.HasPrefix(r.URL.Path, "/api/") {
				w.Header().Set("Cache-Control", "private, max-age=3600")
			}
			// Cache HTML pages for 1 hour
			if strings.HasSuffix(r.URL.Path, ".html") || r.URL.Path == "/" {
				w.Header().Set("Cache-Control", "public, max-age=3600")
			}
			next.ServeHTTP(w, r)
		})
	}

	// API Routes with CORS
	http.HandleFunc("/api/register", withCORS(handleRegister))
	http.HandleFunc("/api/login", withCORS(handleLogin))
	http.HandleFunc("/api/user", withCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			handleGetUser(w, r)
		} else if r.Method == http.MethodPut || r.Method == http.MethodPatch {
			handleUpdateUser(w, r)
		} else {
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}))
	http.HandleFunc("/api/cart", withCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			handleGetCart(w, r)
		} else if r.Method == http.MethodPost {
			handleUpdateCart(w, r)
		} else {
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}))
	http.HandleFunc("/api/purchase-history", withCORS(handleGetPurchaseHistory))
	http.HandleFunc("/api/checkout", withCORS(handleCheckout))
	http.HandleFunc("/api/logout", withCORS(handleLogout))
	http.HandleFunc("/api/user-preferences", withCORS(handleUserPreferences))
	http.HandleFunc("/api/user-activity", withCORS(handleUserActivity))
	http.HandleFunc("/api/recommendations", withCORS(handleGetRecommendations))

	// Products API routes
	http.HandleFunc("/api/products", withCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			handleGetProducts(w, r)
		} else if r.Method == http.MethodPost {
			handleCreateProduct(w, r)
		} else if r.Method == http.MethodPut {
			handleUpdateProduct(w, r)
		} else if r.Method == http.MethodDelete {
			handleDeleteProduct(w, r)
		} else {
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}))

	// Static files from parent directory with cache middleware
	// Serve root directory which contains public/, index.html, etc.
	fs := http.FileServer(http.Dir(".."))
	http.Handle("/", cacheMiddleware(fs))

	log.Printf("🌿 Serving parent directory (..) on HTTP %s\n", *addr)

	// Build a localhost URL for convenience
	port := strings.TrimLeft(*addr, ":")
	if port == "" {
		port = "80"
	}
	url := fmt.Sprintf("http://localhost:%s/", port)

	fmt.Printf("\x1b]8;;%s\x07%s\x1b]8;;\x07\n", url, url)
	fmt.Println(url)

	if err := http.ListenAndServe(*addr, nil); err != nil {
		log.Fatal(err)
	}
}
