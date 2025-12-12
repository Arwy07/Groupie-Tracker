package game

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"sync"

	"groupie/src/api"
	"groupie/src/models"
)

// DataService gère le chargement et la mise à jour des données
type DataService struct {
	App    *models.App
	Client *api.Client
}

// NewDataService crée un nouveau service de données
func NewDataService(app *models.App, client *api.Client) *DataService {
	return &DataService{
		App:    app,
		Client: client,
	}
}

// RefreshData recharge toutes les données depuis l'API
func (d *DataService) RefreshData(ctx context.Context) error {
	index, err := d.Client.FetchIndex(ctx)
	if err != nil {
		return fmt.Errorf("index api: %w", err)
	}

	remoteArtists, err := d.Client.FetchArtists(ctx, index.ArtistsURL)
	if err != nil {
		return fmt.Errorf("chargement artistes: %w", err)
	}

	out := make([]models.Artist, len(remoteArtists))
	errCh := make(chan error, len(remoteArtists))
	var wg sync.WaitGroup

	for i, apiArt := range remoteArtists {
		wg.Add(1)
		go func(idx int, data models.APIArtist) {
			defer wg.Done()
			rel, err := d.Client.FetchRelations(ctx, data.RelationsURL)
			if err != nil {
				errCh <- fmt.Errorf("relation artiste %d: %w", data.ID, err)
				return
			}
			out[idx] = CombineArtist(data, *rel)
		}(i, apiArt)
	}

	wg.Wait()
	close(errCh)
	if len(errCh) > 0 {
		return <-errCh
	}

	sort.Slice(out, func(i, j int) bool {
		return strings.ToLower(out[i].Name) < strings.ToLower(out[j].Name)
	})

	locationSet := map[string]struct{}{}
	for _, art := range out {
		for _, c := range art.Concerts {
			locationSet[c.DisplayLocation] = struct{}{}
		}
	}
	
	locations := make([]string, 0, len(locationSet))
	for loc := range locationSet {
		locations = append(locations, loc)
	}
	sort.Strings(locations)

	d.App.Mu.Lock()
	d.App.Artists = out
	d.App.Locations = locations
	d.App.Mu.Unlock()

	return nil
}

// GetArtists retourne une copie de la liste des artistes
func (d *DataService) GetArtists() []models.Artist {
	d.App.Mu.RLock()
	defer d.App.Mu.RUnlock()
	cp := make([]models.Artist, len(d.App.Artists))
	copy(cp, d.App.Artists)
	return cp
}

// FindArtistByID trouve un artiste par son ID
func (d *DataService) FindArtistByID(id int) (models.Artist, bool) {
	d.App.Mu.RLock()
	defer d.App.Mu.RUnlock()
	for _, art := range d.App.Artists {
		if art.ID == id {
			return art, true
		}
	}
	return models.Artist{}, false
}


