package app

import (
	"context"
	"html/template"
	"log"
	"net/http"
	"time"

	"groupie/src/go/api"
	"groupie/src/go/config"
	"groupie/src/go/db"
	"groupie/src/go/game"
	"groupie/src/go/geo"
	"groupie/src/go/models"
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

	// Pré-géocoder TOUS les lieux au démarrage
	log.Println("Pré-chargement des coordonnées des concerts...")
	preloadAllCoordinates(dataService, geocodeService)
	log.Println("Coordonnées pré-chargées avec succès")

	return &AppInitializer{
		App:            app,
		APIClient:      apiClient,
		GeocodeService: geocodeService,
		DataService:    dataService,
		Templates:      tmplSet,
	}, nil
}

// preloadAllCoordinates charge toutes les coordonnées au démarrage
func preloadAllCoordinates(dataService *game.DataService, geocodeService *api.GeocodeService) {
	artists := dataService.GetArtists()

	coordsCount := 0
	missingCount := 0

	for i := range artists {
		for j := range artists[i].Concerts {
			concert := &artists[i].Concerts[j]

			// Si déjà des coordonnées, skip
			if concert.Coordinates != nil {
				coordsCount++
				continue
			}

			// Essayer le cache de lieux connus
			if coords, ok := geo.GetVenueCoordinates(concert.DisplayLocation); ok {
				concert.Coordinates = coords
				coordsCount++
				continue
			}

			if coords, ok := geo.GetVenueCoordinates(concert.Location); ok {
				concert.Coordinates = coords
				coordsCount++
				continue
			}

			// Ne PAS appeler l'API au démarrage - trop lent
			// Les lieux sans coordonnées ne seront pas affichés sur la carte
			missingCount++
		}
	}

	log.Printf("Coordonnées: %d trouvées, %d manquantes", coordsCount, missingCount)
}
