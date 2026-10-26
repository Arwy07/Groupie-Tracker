package server

import (
	"crypto/tls"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"time"

	"groupie/src/go/config"
)

func newServer(handler http.Handler) (*http.Server, string, string, error) {
	host := os.Getenv("HOST")
	if host == "" {
		host = "127.0.0.1"
	}
	cert, key := os.Getenv("TLS_CERT_FILE"), os.Getenv("TLS_KEY_FILE")
	if (cert == "") != (key == "") {
		return nil, "", "", fmt.Errorf("TLS_CERT_FILE et TLS_KEY_FILE doivent être renseignés ensemble")
	}
	s := &http.Server{
		Addr:              net.JoinHostPort(host, config.GetPort()),
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20,
		TLSConfig:         &tls.Config{MinVersion: tls.VersionTLS12},
	}
	return s, cert, key, nil
}

func StartServer(handler http.Handler) error {
	s, cert, key, err := newServer(handler)
	if err != nil {
		return err
	}
	if cert != "" {
		log.Printf("Serveur HTTPS disponible sur https://%s", s.Addr)
		return s.ListenAndServeTLS(cert, key)
	}
	log.Printf("Démonstration locale disponible sur http://%s", s.Addr)
	return s.ListenAndServe()
}
