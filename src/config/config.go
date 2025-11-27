package config

import (
	"os"
	"time"
)

const (
	// BaseAPIURL est l'URL de base de l'API Groupie Tracker
	BaseAPIURL = "https://groupietrackers.herokuapp.com/api"
	
	// ReadTimeout est le timeout pour les requêtes HTTP
	ReadTimeout = 10 * time.Second
	
	// UserAgentValue est la valeur du User-Agent pour les requêtes
	UserAgentValue = "GroupieTrackerStudent/1.0 (ynov project)"
)

// GetPort retourne le port du serveur depuis les variables d'environnement
func GetPort() string {
	port := os.Getenv("PORT")
	if port == "" {
		return "8080"
	}
	return port
}

