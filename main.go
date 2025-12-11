package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"
)

type User struct {
	ID           int       `json:"id"`
	Email        string    `json:"email"`
	Password     string    `json:"-"`
	Nom          string    `json:"nom"`
	Prenom       string    `json:"prenom"`
	Sexe         string    `json:"sexe"`
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

type UserData struct {
	Users    map[int]*User             `json:"users"`
	Carts    map[int][]CartItem        `json:"carts"`
	History  map[int][]PurchaseHistory `json:"history"`
	Sessions map[string]int            `json:"sessions"`
	NextID   int                       `json:"next_id"`
}

type RegisterRequest struct {
	Email  string `json:"email"`
	Nom    string `json:"nom"`
	Prenom string `json:"prenom"`
	Sexe   string `json:"sexe"`
	Pass   string `json:"password"`
}

type LoginRequest struct {
	Email string `json:"email"`
	Pass  string `json:"password"`
}

var (
	data     *UserData
	dataMu   sync.RWMutex
	dataFile = "data.json"
)

func initData() error {
	data = &UserData{
		Users:    make(map[int]*User),
		Carts:    make(map[int][]CartItem),
		History:  make(map[int][]PurchaseHistory),
		Sessions: make(map[string]int),
		NextID:   1,
	}

	// Try to load existing data
	if content, err := ioutil.ReadFile(dataFile); err == nil {
		json.Unmarshal(content, data)
	}

	return saveData()
}

func saveData() error {
	dataMu.RLock()
	defer dataMu.RUnlock()

	content, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}
	return ioutil.WriteFile(dataFile, content, 0644)
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

	dataMu.RLock()
	userID, exists := data.Sessions[token]
	dataMu.RUnlock()

	if !exists {
		return 0, fmt.Errorf("invalid session")
	}
	return userID, nil
}

func createSession(userID int) string {
	token := fmt.Sprintf("tok_%d_%d", userID, time.Now().UnixNano())
	dataMu.Lock()
	data.Sessions[token] = userID
	dataMu.Unlock()
	saveData()
	return token
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

	if req.Email == "" || req.Pass == "" || req.Nom == "" || req.Prenom == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Missing required fields"})
		return
	}

	dataMu.Lock()
	// Check if email exists
	for _, u := range data.Users {
		if u.Email == req.Email {
			dataMu.Unlock()
			w.WriteHeader(http.StatusConflict)
			json.NewEncoder(w).Encode(map[string]string{"error": "Email already exists"})
			return
		}
	}

	userID := data.NextID
	data.NextID++
	user := &User{
		ID:           userID,
		Email:        req.Email,
		Password:     hashPassword(req.Pass),
		Nom:          req.Nom,
		Prenom:       req.Prenom,
		Sexe:         req.Sexe,
		DateCreation: time.Now(),
	}
	data.Users[userID] = user
	data.Carts[userID] = []CartItem{}
	data.History[userID] = []PurchaseHistory{}
	dataMu.Unlock()

	saveData()
	token := createSession(userID)

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

	passwordHash := hashPassword(req.Pass)
	dataMu.RLock()
	var user *User
	for _, u := range data.Users {
		if u.Email == req.Email && u.Password == passwordHash {
			user = u
			break
		}
	}
	dataMu.RUnlock()

	if user == nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid credentials"})
		return
	}

	token := createSession(user.ID)
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

	dataMu.RLock()
	user, exists := data.Users[userID]
	dataMu.RUnlock()

	if !exists {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "User not found"})
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

	dataMu.Lock()
	data.Carts[userID] = items
	dataMu.Unlock()
	saveData()

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

	dataMu.RLock()
	items := data.Carts[userID]
	dataMu.RUnlock()

	if items == nil {
		items = []CartItem{}
	}

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

	dataMu.RLock()
	history := data.History[userID]
	dataMu.RUnlock()

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

	dataMu.Lock()
	purchase := PurchaseHistory{
		ID:    len(data.History[userID]) + 1,
		Date:  time.Now(),
		Total: checkoutData.Total,
		Items: checkoutData.Items,
	}
	data.History[userID] = append(data.History[userID], purchase)
	data.Carts[userID] = []CartItem{}
	dataMu.Unlock()
	saveData()

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "message": "Purchase completed"})
}

func handleLogout(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	token := r.Header.Get("Authorization")
	if token != "" {
		dataMu.Lock()
		delete(data.Sessions, token)
		dataMu.Unlock()
		saveData()
	}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"success": "true"})
}

func main() {
	dir := flag.String("dir", ".", "directory to serve")
	addr := flag.String("addr", ":8080", "address to listen on")
	flag.Parse()

	// Initialize data
	if err := initData(); err != nil {
		log.Fatal("Data initialization failed:", err)
	}

	// API Routes
	http.HandleFunc("/api/register", handleRegister)
	http.HandleFunc("/api/login", handleLogin)
	http.HandleFunc("/api/user", handleGetUser)
	http.HandleFunc("/api/cart", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			handleGetCart(w, r)
		} else if r.Method == http.MethodPost {
			handleUpdateCart(w, r)
		} else {
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	})
	http.HandleFunc("/api/purchase-history", handleGetPurchaseHistory)
	http.HandleFunc("/api/checkout", handleCheckout)
	http.HandleFunc("/api/logout", handleLogout)

	// Static files
	fs := http.FileServer(http.Dir(*dir))
	http.Handle("/", fs)

	log.Printf("Serving %s on HTTP %s\n", *dir, *addr)

	// Build a localhost URL for convenience (use port from addr)
	port := strings.TrimLeft(*addr, ":")
	if port == "" {
		port = "80"
	}
	url := fmt.Sprintf("http://localhost:%s/", port)

	// OSC 8 hyperlink sequence (many terminals support it). Fallback to plain URL.
	// Format: ESC ] 8 ;; <url> BEL <text> ESC ] 8 ;; BEL
	osc := "\x1b]8;;%s\x07%s\x1b]8;;\x07"
	fmt.Printf(osc+"\n", url, url)
	fmt.Println(url)

	if err := http.ListenAndServe(*addr, nil); err != nil {
		log.Fatal(err)
	}
}
