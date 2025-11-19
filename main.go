package main

import (
    "flag"
    "fmt"
    "log"
    "net/http"
    "path/filepath"
)

// Simple dev server to serve the project files and a small API endpoint
func main() {
    port := flag.Int("port", 8080, "Port to listen on")
    dir := flag.String("dir", ".", "Project root directory (default .)")
    flag.Parse()

    root, err := filepath.Abs(*dir)
    if err != nil {
        log.Fatalf("failed to resolve project root: %v", err)
    }

    mux := http.NewServeMux()

    // Serve assets at /assets/
    assetsPath := filepath.Join(root, "assets")
    mux.Handle("/assets/", http.StripPrefix("/assets/", http.FileServer(http.Dir(assetsPath))))

    // Serve src (js, database, etc.) at /src/
    srcPath := filepath.Join(root, "src")
    mux.Handle("/src/", http.StripPrefix("/src/", http.FileServer(http.Dir(srcPath))))

    // Serve temp (contains homepage) at /temp/
    tempPath := filepath.Join(root, "temp")
    mux.Handle("/temp/", http.StripPrefix("/temp/", http.FileServer(http.Dir(tempPath))))

    // Root handler: serve temp/homepage/homepage.html when requesting /
    mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        if r.URL.Path == "/" || r.URL.Path == "/index.html" {
            index := filepath.Join(root, "temp", "homepage", "homepage.html")
            http.ServeFile(w, r, index)
            return
        }
        // fallback to file server relative to project root for other paths (not exposing sensitive files)
        http.NotFound(w, r)
    })

    // Simple API endpoint to return products JSON
    mux.HandleFunc("/api/products", func(w http.ResponseWriter, r *http.Request) {
        p := filepath.Join(root, "src", "database", "products.json")
        http.ServeFile(w, r, p)
    })

    addr := fmt.Sprintf(":%d", *port)
    log.Printf("Starting server at http://localhost%s", addr)
    log.Fatal(http.ListenAndServe(addr, mux))
}
