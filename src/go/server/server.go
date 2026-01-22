package server

import (
	"log"
	"net/http"

	"groupie/src/go/config"
)

func StartServer(handler http.Handler) error {
	port := config.GetPort()
	if port == "" {
		port = "443"
	}

	log.Printf("Serveur HTTPS disponible sur https://localhost:%s\n", port)
	return http.ListenAndServeTLS(":"+port, "docs/localhost.crt", "docs/localhost.key", handler)
}

