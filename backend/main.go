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

	_ "github.com/lib/pq"
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

type MaintenanceMode struct {
	Enabled bool `json:"enabled"`
}

var db *sql.DB
var maintenanceEnabled = false
var defaultSiteTheme = "light"

func initDB() error {
	var err error
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		return fmt.Errorf("DATABASE_URL environment variable is not set")
	}
	db, err = sql.Open("postgres", databaseURL)
	if err != nil {
		return err
	}

	// Test connection
	if err = db.Ping(); err != nil {
		return err
	}

	// Verify existing Neon schema tables
	tables := []string{"utilisateurs", "produits", "categories", "commandes", "commande_details", "paiements"}
	for _, table := range tables {
		var exists bool
		err = db.QueryRow(`
			SELECT EXISTS (
				SELECT FROM information_schema.tables 
				WHERE table_schema = 'public' 
				AND table_name = $1
			)
		`, table).Scan(&exists)
		if err == nil && exists {
			log.Printf("✓ Table %s exists", table)
		}
	}

	log.Println("✓ Connected to Neon PostgreSQL database successfully")
	return nil
}

func initSiteSettings() error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS site_settings (
			setting_key TEXT PRIMARY KEY,
			setting_value TEXT NOT NULL,
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return err
	}

	if err := db.QueryRow(`SELECT COALESCE((SELECT setting_value FROM site_settings WHERE setting_key = 'default_theme' LIMIT 1), 'light')`).Scan(&defaultSiteTheme); err != nil {
		defaultSiteTheme = "light"
		return err
	}

	return nil
}

func hashPassword(password string) string {
	hash := sha256.Sum256([]byte(password))
	return hex.EncodeToString(hash[:])
}

func isLocalAdminToken(token string) bool {
	return strings.HasPrefix(token, "admin-token-") || token == "admin-dev"
}

func getSessionUserID(r *http.Request) (int, error) {
	token := r.Header.Get("Authorization")
	if token == "" {
		return 0, fmt.Errorf("no session")
	}

	if isLocalAdminToken(token) {
		return 0, nil
	}

	var userID int
	var expiresAt time.Time
	err := db.QueryRow("SELECT user_id, expires_at FROM sessions WHERE token = $1", token).Scan(&userID, &expiresAt)
	if err != nil {
		return 0, fmt.Errorf("invalid session")
	}

	if expiresAt.Before(time.Now()) {
		db.Exec("DELETE FROM sessions WHERE token = $1", token)
		return 0, fmt.Errorf("session expired")
	}

	return userID, nil
}

func createSession(userID int) string {
	// Clean expired sessions
	db.Exec("DELETE FROM sessions WHERE expires_at < NOW()")

	token := fmt.Sprintf("tok_%d_%d", userID, time.Now().UnixNano())
	expiresAt := time.Now().Add(30 * 24 * time.Hour) // 30 days

	db.Exec("INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)",
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
	var userID int
	err := db.QueryRow(
		"INSERT INTO utilisateurs (email, mot_de_passe, nom, prenom, sexe) VALUES ($1, $2, $3, $4, $5) RETURNING id",
		req.Email, passwordHash, req.Nom, req.Prenom, req.Sexe,
	).Scan(&userID)

	if err != nil {
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]string{"error": "Email already exists"})
		return
	}

	token := createSession(userID)

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
		"SELECT id, email, nom, prenom, sexe, COALESCE(adresse, ''), COALESCE(telephone, ''), date_inscription, mot_de_passe FROM utilisateurs WHERE email = $1",
		req.Email,
	).Scan(&user.ID, &user.Email, &user.Nom, &user.Prenom, &user.Sexe, &user.Role, &user.PDP, &user.DateCreation, &storedHash)

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
	if isLocalAdminToken(r.Header.Get("Authorization")) {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(User{
			ID:           0,
			Email:        "admin@lowa.com",
			Nom:          "Admin",
			Prenom:       "LOWA",
			Sexe:         "",
			Role:         "admin",
			PDP:          "",
			DateCreation: time.Now(),
		})
		return
	}
	userID, err := getSessionUserID(r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Not authenticated"})
		return
	}

	var user User
	err = db.QueryRow(
		"SELECT id, email, nom, prenom, sexe, COALESCE(adresse, '') as role, COALESCE(telephone, '') as pdp, date_inscription FROM utilisateurs WHERE id = $1",
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

	// Update user phone (using telephone column in Neon schema)
	_, err = db.Exec("UPDATE utilisateurs SET telephone = $1 WHERE id = $2", updateData.PDP, userID)
	if err != nil {
		log.Printf("Error updating user: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to update profile"})
		return
	}

	// Return updated user
	var user User
	err = db.QueryRow(
		"SELECT id, email, nom, prenom, sexe, COALESCE(adresse, ''), COALESCE(telephone, ''), date_inscription FROM utilisateurs WHERE id = $1",
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

	log.Printf("Cart updated for user %d: %d items", userID, len(items))

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"success": "true"})
}

func handleGetCart(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_, err := getSessionUserID(r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Not authenticated"})
		return
	}

	// Note: Cart management would need to be added to Neon schema if needed
	// For now, return empty cart
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode([]CartItem{})
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
		"SELECT id, date_commande, total FROM commandes WHERE id_utilisateur = $1 ORDER BY date_commande DESC",
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
		rows.Scan(&p.ID, &p.Date, &p.Total)
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

	// Insert order into commandes table
	var orderID int
	err = db.QueryRow(
		"INSERT INTO commandes (id_utilisateur, total) VALUES ($1, $2) RETURNING id",
		userID, checkoutData.Total,
	).Scan(&orderID)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to process purchase"})
		return
	}

	log.Printf("Purchase completed for user ID: %d (Order: %d, Total: %.2f EUR)", userID, orderID, checkoutData.Total)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"message":  "Purchase completed",
		"order_id": orderID,
	})
}

func handleLogout(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	token := r.Header.Get("Authorization")

	if token != "" {
		db.Exec("DELETE FROM sessions WHERE token = $1", token)
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

	// Note: User preferences would need to be added to Neon schema if needed
	log.Printf("User %d preferences: %s", userID, body.CookieConsent)

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

	log.Printf("User %d activity: page=%s, items=%d", userID, body.Page, len(body.ViewedProducts))

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

	// Simple recommendation: return recently viewed products from orders
	rows, err := db.Query(
		`SELECT DISTINCT p.id, p.nom, p.prix, p.image_url 
		 FROM commandes c 
		 JOIN commande_details cd ON c.id = cd.id_commande 
		 JOIN produits p ON cd.id_produit = p.id 
		 WHERE c.id_utilisateur = $1 
		 ORDER BY c.date_commande DESC LIMIT 5`,
		userID,
	)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch recommendations"})
		return
	}
	defer rows.Close()

	type RecommendationResponse struct {
		RecentlyViewed []Product `json:"recently_viewed"`
		Message        string    `json:"message"`
	}

	var recentlyViewed []Product
	for rows.Next() {
		var p Product
		if err := rows.Scan(&p.ID, &p.Name, &p.Price, &p.Image); err != nil {
			continue
		}
		recentlyViewed = append(recentlyViewed, p)
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(RecommendationResponse{
		RecentlyViewed: recentlyViewed,
		Message:        "Produits recommandés basés sur votre historique",
	})
}

// Helper function to check if user is admin
func isAdmin(r *http.Request) (int, bool) {
	token := r.Header.Get("Authorization")
	if isLocalAdminToken(token) {
		return 0, true
	}

	userID, err := getSessionUserID(r)
	if err != nil {
		return 0, false
	}

	// For now, only the local admin token or a valid session can access admin routes.
	return userID, false
}

func handleGetAdminStats(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
		return
	}

	_, admin := isAdmin(r)
	if !admin {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Admin access required"})
		return
	}

	countRows := func(query string) int {
		var count int
		if err := db.QueryRow(query).Scan(&count); err != nil {
			return 0
		}
		return count
	}

	stats := map[string]int{
		"products": countRows("SELECT COUNT(*) FROM produits"),
		"users":    countRows("SELECT COUNT(*) FROM utilisateurs"),
		"orders":   countRows("SELECT COUNT(*) FROM commandes"),
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(stats)
}

// Get all products
func handleGetProducts(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	rows, err := db.Query(`
		SELECT id, nom, prix, description, image_url, created_at 
		FROM produits 
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
		err := rows.Scan(&p.ID, &p.Name, &p.Price, &p.Description, &p.Image, &p.CreatedAt)
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

	var productID int
	err := db.QueryRow(`
		INSERT INTO produits (nom, description, prix, image_url) 
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`, product.Name, product.Description, product.Price, product.Image).Scan(&productID)

	if err != nil {
		log.Printf("Error creating product: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create product"})
		return
	}

	product.ID = productID
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
		UPDATE produits 
		SET nom = $1, prix = $2, description = $3, image_url = $4
		WHERE id = $5
	`, product.Name, product.Price, product.Description, product.Image, product.ID)

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

	_, err := db.Exec("DELETE FROM produits WHERE id = $1", productID)
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

// Get maintenance mode status
func handleGetMaintenanceMode(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// For now, maintenance mode is disabled (stored in variable)
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{"enabled": maintenanceEnabled})
}

// Set maintenance mode (admin only)
func handleSetMaintenanceMode(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	_, admin := isAdmin(r)
	if !admin {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Admin access required"})
		return
	}

	var body MaintenanceMode
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
		return
	}

	maintenanceEnabled = body.Enabled
	log.Printf("Maintenance mode set to: %v", body.Enabled)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{"enabled": body.Enabled})
}

// Get default theme (public endpoint)
func handleGetDefaultTheme(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	theme := defaultSiteTheme
	if err := db.QueryRow(`
		SELECT COALESCE(setting_value, 'light')
		FROM site_settings
		WHERE setting_key = 'default_theme'
		LIMIT 1
	`).Scan(&theme); err != nil {
		theme = defaultSiteTheme
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"theme": theme})
}

// Set default theme (admin only)
func handleSetDefaultTheme(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	_, admin := isAdmin(r)
	if !admin {
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]string{"error": "Admin access required"})
		return
	}

	var body map[string]string
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request"})
		return
	}

	theme, ok := body["theme"]
	if !ok || theme == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Theme is required"})
		return
	}

	// Validate theme
	validThemes := map[string]bool{"noel": true, "light": true, "dark": true, "temperate": true}
	if !validThemes[theme] {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid theme"})
		return
	}

	if _, err := db.Exec(`
		INSERT INTO site_settings (setting_key, setting_value, updated_at)
		VALUES ('default_theme', $1, NOW())
		ON CONFLICT (setting_key)
		DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
	`, theme); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to save theme"})
		return
	}

	defaultSiteTheme = theme

	log.Printf("Default theme updated to: %s", theme)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"theme":   theme,
		"message": "Default theme updated successfully",
	})
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
	if err := initSiteSettings(); err != nil {
		log.Printf("⚠️ Site settings initialization warning: %v", err)
	}
	defer db.Close()

	// Middleware to add cache headers
	cacheMiddleware := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// NO cache for HTML files - always check for updates
			if strings.HasSuffix(r.URL.Path, ".html") || r.URL.Path == "/" {
				w.Header().Set("Cache-Control", "public, max-age=0, must-revalidate")
				w.Header().Set("Pragma", "no-cache")
				w.Header().Set("Expires", "0")
			} else if strings.HasSuffix(r.URL.Path, ".js") || strings.HasSuffix(r.URL.Path, ".css") {
				// Short cache for JS/CSS files - 5 minutes
				w.Header().Set("Cache-Control", "public, max-age=300, must-revalidate")
			} else if strings.HasPrefix(r.URL.Path, "/assets/") || strings.HasPrefix(r.URL.Path, "/public/") {
				// Cache other assets for 24 hours (revalidate if modified)
				w.Header().Set("Cache-Control", "public, max-age=86400, must-revalidate")
			} else if strings.HasPrefix(r.URL.Path, "/api/") {
				// No cache for API responses
				w.Header().Set("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate")
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
	http.HandleFunc("/api/admin/stats", withCORS(handleGetAdminStats))

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

	// Maintenance mode API routes
	http.HandleFunc("/api/maintenance-mode", withCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			handleGetMaintenanceMode(w, r)
		} else if r.Method == http.MethodPost {
			handleSetMaintenanceMode(w, r)
		} else {
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	}))

	// Theme settings API routes
	http.HandleFunc("/api/admin/settings/default-theme", withCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			handleGetDefaultTheme(w, r)
		} else if r.Method == http.MethodPost {
			handleSetDefaultTheme(w, r)
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
