package utils

import (
	"encoding/json"
	"log"
	"net/http"
)

// RespondJSON envoie une réponse JSON
func RespondJSON(w http.ResponseWriter, payload interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Println("json encode:", err)
	}
}

// RespondError envoie une réponse d'erreur JSON
func RespondError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}

