package support

import (
	"log"
	"net/http"

	"groupie/src/config"
)

// StartServer démarre le serveur HTTPS
func StartServer(handler http.Handler) error {
	port := config.GetPort()
	if port == "" {
		port = "443"
	}

	log.Printf("Serveur HTTPS disponible sur https://localhost:%s\n", port)
	return http.ListenAndServeTLS(":"+port, "docs/localhost.crt", "docs/localhost.key", handler)
}

