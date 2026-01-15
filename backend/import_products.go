//go:build ignore
// +build ignore

package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
)

type Product struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	Price       float64 `json:"price"`
	Description string  `json:"description"`
	Image       string  `json:"image"`
	Category    string  `json:"category"`
	Subcategory string  `json:"subcategory"`
	Collection  string  `json:"collection"`
}

func main() {
	// Get database URL from environment
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL environment variable is not set")
	}

	// Open database
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		log.Fatal("Failed to open database:", err)
	}
	defer db.Close()

	// Test connection
	if err = db.Ping(); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Read JSON file
	data, err := os.ReadFile("../public/data/products.json")
	if err != nil {
		log.Fatal("Failed to read products.json:", err)
	}

	// Parse JSON
	var products []Product
	if err := json.Unmarshal(data, &products); err != nil {
		log.Fatal("Failed to parse JSON:", err)
	}

	// Insert products
	for _, p := range products {
		_, err := db.Exec(`
			INSERT INTO produits (nom, description, prix, image_url, id_categorie) 
			VALUES ($1, $2, $3, $4, (SELECT id FROM categories WHERE nom = $5))
			ON CONFLICT DO NOTHING
		`, p.Name, p.Description, p.Price, p.Image, p.Category)

		if err != nil {
			log.Printf("Failed to insert product %s: %v", p.Name, err)
		} else {
			fmt.Printf("✓ Imported: %s\n", p.Name)
		}
	}

	fmt.Printf("\n✅ Successfully imported %d products!\n", len(products))
}
