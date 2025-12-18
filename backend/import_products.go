//go:build ignore
// +build ignore

package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"

	_ "modernc.org/sqlite"
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
	// Open database
	db, err := sql.Open("sqlite", "../lowa.db")
	if err != nil {
		log.Fatal("Failed to open database:", err)
	}
	defer db.Close()

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
			INSERT OR REPLACE INTO products (id, name, price, description, image, category, subcategory, collection) 
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`, p.ID, p.Name, p.Price, p.Description, p.Image, p.Category, p.Subcategory, p.Collection)

		if err != nil {
			log.Printf("Failed to insert product %s: %v", p.Name, err)
		} else {
			fmt.Printf("✓ Imported: %s\n", p.Name)
		}
	}

	fmt.Printf("\n✅ Successfully imported %d products!\n", len(products))
}
