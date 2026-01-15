package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"

	"groupie/src/models"
)

// GeocodeService gère le géocodage des localisations
type GeocodeService struct {
	Client     *Client
	Cache      map[string]models.Coordinates
	CacheMu    sync.RWMutex
}

// NewGeocodeService crée un nouveau service de géocodage
func NewGeocodeService(client *Client) *GeocodeService {
	return &GeocodeService{
		Client: client,
		Cache:  make(map[string]models.Coordinates),
	}
}

// LookupCoordinates récupère les coordonnées d'une localisation (avec cache)
func (g *GeocodeService) LookupCoordinates(ctx context.Context, location string) (*models.Coordinates, error) {
	key := strings.ToLower(location)
	
	g.CacheMu.RLock()
	if coords, ok := g.Cache[key]; ok {
		g.CacheMu.RUnlock()
		return &coords, nil
	}
	g.CacheMu.RUnlock()

	coords, err := g.geocode(ctx, location)
	if err != nil {
		return nil, err
	}

	g.CacheMu.Lock()
	g.Cache[key] = *coords
	g.CacheMu.Unlock()

	return coords, nil
}

// geocode effectue le géocodage via OpenStreetMap Nominatim
func (g *GeocodeService) geocode(ctx context.Context, location string) (*models.Coordinates, error) {
	// Utiliser l'API Nominatim avec un User-Agent approprié
	baseURL := "https://nominatim.openstreetmap.org/search"
	params := url.Values{}
	params.Set("format", "json")
	params.Set("limit", "1")
	params.Set("q", location)
	params.Set("addressdetails", "1")
	
	query := fmt.Sprintf("%s?%s", baseURL, params.Encode())
	
	var results []struct {
		Lat string `json:"lat"`
		Lon string `json:"lon"`
	}
	
	// Créer une requête avec User-Agent personnalisé pour Nominatim
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, query, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "GroupieTracker/1.0 (Educational Project)")
	
	resp, err := g.Client.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("geocoding failed: status %d", resp.StatusCode)
	}
	
	if err := json.NewDecoder(resp.Body).Decode(&results); err != nil {
		return nil, err
	}
	
	if len(results) == 0 {
		return nil, errors.New("aucune coordonnée")
	}
	
	lat, err := strconv.ParseFloat(results[0].Lat, 64)
	if err != nil {
		return nil, err
	}
	
	lon, err := strconv.ParseFloat(results[0].Lon, 64)
	if err != nil {
		return nil, err
	}
	
	return &models.Coordinates{Latitude: lat, Longitude: lon}, nil
}

