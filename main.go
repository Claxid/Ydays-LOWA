package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"strings"
)

func main() {
	dir := flag.String("dir", ".", "directory to serve")
	addr := flag.String("addr", ":8080", "address to listen on")
	flag.Parse()
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
