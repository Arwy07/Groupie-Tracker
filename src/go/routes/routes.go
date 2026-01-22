package routes

import (
	"net/http"

	"groupie/src/go/app"
	"groupie/src/go/handlers/api"
	"groupie/src/go/handlers/artist"
	"groupie/src/go/handlers/auth"
	"groupie/src/go/handlers/cart"
	"groupie/src/go/handlers/checkout"
	"groupie/src/go/handlers/dashboard"
	"groupie/src/go/handlers/home"
	"groupie/src/go/handlers/landing"
	"groupie/src/go/handlers/user"
	"groupie/src/go/middleware"
)

func SetupRoutes() (http.Handler, error) {
	appInit, err := app.InitializeApp()
	if err != nil {
		return nil, err
	}

	landingHandler := landing.NewLandingHandler(appInit.Templates)
	authHandler := auth.NewAuthHandler(appInit.Templates)
	homeHandler := home.NewHomeHandler(appInit.DataService, appInit.Templates)
	artistHandler := artist.NewArtistHandler(appInit.DataService, appInit.GeocodeService, appInit.Templates)
	apiHandler := api.NewAPIHandler(appInit.DataService, appInit.GeocodeService)
	userHandler := user.NewUserHandler(appInit.Templates)
	cartHandler := cart.NewCartHandler()
	dashboardHandler := dashboard.NewDashboardHandler(appInit.Templates)
	checkoutHandler := checkout.NewCheckoutHandler(appInit.Templates)

	mux := http.NewServeMux()
	mux.Handle("/assets/", http.StripPrefix("/assets/", http.FileServer(http.Dir("assets"))))
	mux.Handle("/script/", http.StripPrefix("/script/", http.FileServer(http.Dir("src/js"))))
	mux.HandleFunc("/", landingHandler.Handle)
	mux.HandleFunc("/login", authHandler.HandleLogin)
	mux.HandleFunc("/register", authHandler.HandleRegister)
	mux.HandleFunc("/logout", userHandler.HandleLogout)
	mux.HandleFunc("/profile", userHandler.HandleProfile)
	mux.HandleFunc("/home", homeHandler.Handle)
	mux.HandleFunc("/artist", artistHandler.Handle)
	mux.HandleFunc("/dashboard", dashboardHandler.Handle)
	mux.HandleFunc("/checkout", checkoutHandler.Handle)
	mux.HandleFunc("/terms", landingHandler.HandleTerms)
	mux.HandleFunc("/api/artists", apiHandler.HandleArtists)
	mux.HandleFunc("/api/filter", apiHandler.HandleFilter)
	mux.HandleFunc("/api/refresh", apiHandler.HandleRefresh)
	mux.HandleFunc("/api/geocode", apiHandler.HandleGeocode)
	mux.HandleFunc("/api/user/favorite", userHandler.HandleToggleFavorite)
	mux.HandleFunc("/api/cart/add", cartHandler.HandleAddItem)
	mux.HandleFunc("/api/cart", cartHandler.HandleGetCart)
	mux.HandleFunc("/api/cart/count", cartHandler.HandleGetCartCount)
	mux.HandleFunc("/api/cart/remove/", cartHandler.HandleRemoveItem)
	mux.HandleFunc("/api/cart/clear", cartHandler.HandleClearCart)
	mux.HandleFunc("/api/payment/create", checkoutHandler.HandleCreatePayment)
	mux.HandleFunc("/api/payment/capture", checkoutHandler.HandleCapturePayment)
	mux.HandleFunc("/api/payment/return", checkoutHandler.HandlePaymentReturn)
	mux.HandleFunc("/api/payment/demo", checkoutHandler.HandleDemoPayment)
	mux.HandleFunc("/api/admin/toggle", userHandler.HandleToggleAdmin)

	return middleware.LoggingMiddleware(mux), nil
}
