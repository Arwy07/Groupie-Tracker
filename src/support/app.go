package support

import (
	"context"
	"html/template"
	"net/http"
	"time"

	"groupie/src/api"
	"groupie/src/config"
	"groupie/src/game"
	"groupie/src/models"
	"groupie/src/support/db"
	"groupie/src/support/templates"
)

// AppInitializer gère l'initialisation de l'application
type AppInitializer struct {
	App            *models.App
	APIClient      *api.Client
	GeocodeService *api.GeocodeService
	DataService    *game.DataService
	Templates      map[string]*template.Template
}

// InitializeApp initialise toute l'application
func InitializeApp() (*AppInitializer, error) {
	// Initialisation de la base de données
	if err := db.InitDB(); err != nil {
		return nil, err
	}

	// Chargement des templates
	tmplSet, err := templates.LoadTemplates()
	if err != nil {
		return nil, err
	}

	// Création de l'application
	app := &models.App{
		Client: &http.Client{
			Timeout: config.ReadTimeout,
		},
		Templates: tmplSet,
		GeoCache:  make(map[string]models.Coordinates),
	}

	// Initialisation des services
	apiClient := api.NewClient(app.Client)
	geocodeService := api.NewGeocodeService(apiClient)
	dataService := game.NewDataService(app, apiClient)

	// Chargement initial des données
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := dataService.RefreshData(ctx); err != nil {
		return nil, err
	}

	return &AppInitializer{
		App:            app,
		APIClient:      apiClient,
		GeocodeService: geocodeService,
		DataService:    dataService,
		Templates:      tmplSet,
	}, nil
}
