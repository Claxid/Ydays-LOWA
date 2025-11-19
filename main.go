package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"time"
)

func main() {
	port := flag.Int("port", 8000, "Port HTTP to listen on")
	dir := flag.String("dir", ".", "Project root directory to serve")
	open := flag.Bool("open", true, "Open browser after starting server")
	flag.Parse()

	root, err := filepath.Abs(*dir)
	if err != nil {
		log.Fatalf("failed to resolve project root: %v", err)
	}

	mux := http.NewServeMux()

	// API endpoint for products (direct file serve)
	mux.HandleFunc("/api/products", func(w http.ResponseWriter, r *http.Request) {
		p := filepath.Join(root, "src", "database", "products.json")
		http.ServeFile(w, r, p)
	})

	// If index.html exists at root, serve the root (FileServer serves index.html)
	indexRoot := filepath.Join(root, "index.html")
	if fileExists(indexRoot) {
		mux.Handle("/", http.FileServer(http.Dir(root)))
	} else {
		// Serve temp/homepage/homepage.html at /
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/" || r.URL.Path == "/index.html" {
				index := filepath.Join(root, "temp", "homepage", "homepage.html")
				http.ServeFile(w, r, index)
				return
			}
			// try to serve static files relative to root
			fsPath := filepath.Join(root, r.URL.Path)
			if fileExists(fsPath) {
				http.ServeFile(w, r, fsPath)
				return
			}
			http.NotFound(w, r)
		})
	}

	addr := fmt.Sprintf(":%d", *port)
	srv := &http.Server{Addr: addr, Handler: mux}

	go func() {
		log.Printf("Serving %s on http://localhost%s", root, addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	if *open {
		go func() {
			time.Sleep(300 * time.Millisecond)
			url := fmt.Sprintf("http://localhost:%d/", *port)
			if err := openBrowser(url); err != nil {
				log.Printf("failed to open browser: %v", err)
			}
		}()
	}

	// graceful shutdown
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt)
	<-stop
	log.Println("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("server shutdown failed: %v", err)
	}
	log.Println("Server stopped")
}

func fileExists(path string) bool {
	if path == "" {
		return false
	}
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	return !info.IsDir()
}

func openBrowser(url string) error {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	return cmd.Start()
}
