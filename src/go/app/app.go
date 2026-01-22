package app

import (
	"context"
	"html/template"
	"net/http"
	"time"

	"groupie/src/go/api"
	"groupie/src/go/config"
	"groupie/src/go/game"
	"groupie/src/go/models"
	"groupie/src/go/db"
	"groupie/src/go/templates"
)

type AppInitializer struct {
	App            *models.App
	APIClient      *api.Client
	GeocodeService *api.GeocodeService
	DataService    *game.DataService
	Templates      map[string]*template.Template
}

func InitializeApp() (*AppInitializer, error) {
	if err := db.InitDB(); err != nil {
		return nil, err
	}

	tmplSet, err := templates.LoadTemplates()
	if err != nil {
		return nil, err
	}

	app := &models.App{
		Client: &http.Client{
			Timeout: config.ReadTimeout,
		},
		Templates: tmplSet,
		GeoCache:  make(map[string]models.Coordinates),
	}

	apiClient := api.NewClient(app.Client)
	geocodeService := api.NewGeocodeService(apiClient)
	dataService := game.NewDataService(app, apiClient)

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

