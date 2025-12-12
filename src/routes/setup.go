package routes

import (
	"net/http"

	"groupie/src/support"
	"groupie/src/support/middleware"
)

// SetupRoutes initialise l'application et configure toutes les routes
func SetupRoutes() (http.Handler, error) {
	// Initialisation de l'application
	app, err := support.InitializeApp()
	if err != nil {
		return nil, err
	}

	// Initialisation des handlers
	homeHandler := NewHomeHandler(app.DataService, app.Templates)
	artistHandler := NewArtistHandler(app.DataService, app.GeocodeService, app.Templates)
	apiHandler := NewAPIHandler(app.DataService)

	// Configuration des routes
	mux := http.NewServeMux()
	mux.Handle("/assets/", http.StripPrefix("/assets/", http.FileServer(http.Dir("assets"))))
	mux.Handle("/script/", http.StripPrefix("/script/", http.FileServer(http.Dir("src/script"))))
	mux.HandleFunc("/", homeHandler.Handle)
	mux.HandleFunc("/artist", artistHandler.Handle)
	mux.HandleFunc("/api/artists", apiHandler.HandleArtists)
	mux.HandleFunc("/api/filter", apiHandler.HandleFilter)
	mux.HandleFunc("/api/refresh", apiHandler.HandleRefresh)

	return middleware.LoggingMiddleware(mux), nil
}
