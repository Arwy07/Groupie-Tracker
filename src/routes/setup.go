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
	landingHandler := NewLandingHandler(app.Templates)
	authHandler := NewAuthHandler(app.Templates)
	homeHandler := NewHomeHandler(app.DataService, app.Templates)
	artistHandler := NewArtistHandler(app.DataService, app.GeocodeService, app.Templates)
	apiHandler := NewAPIHandler(app.DataService, app.GeocodeService)
	userHandler := NewUserHandler(app.Templates)

	// Configuration des routes
	mux := http.NewServeMux()
	mux.Handle("/assets/", http.StripPrefix("/assets/", http.FileServer(http.Dir("assets"))))
	mux.Handle("/script/", http.StripPrefix("/script/", http.FileServer(http.Dir("src/script"))))
	mux.HandleFunc("/", landingHandler.Handle)
	mux.HandleFunc("/login", authHandler.HandleLogin)
	mux.HandleFunc("/register", authHandler.HandleRegister)
	mux.HandleFunc("/logout", userHandler.HandleLogout)
	mux.HandleFunc("/profile", userHandler.HandleProfile)
	mux.HandleFunc("/home", homeHandler.Handle)
	mux.HandleFunc("/artist", artistHandler.Handle)
	mux.HandleFunc("/api/artists", apiHandler.HandleArtists)
	mux.HandleFunc("/api/filter", apiHandler.HandleFilter)
	mux.HandleFunc("/api/refresh", apiHandler.HandleRefresh)
	mux.HandleFunc("/api/geocode", apiHandler.HandleGeocode)
	mux.HandleFunc("/api/user/favorite", userHandler.HandleToggleFavorite)

	return middleware.LoggingMiddleware(mux), nil
}
