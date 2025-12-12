package api

import (
	"context"
	"errors"
	"fmt"
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
	query := fmt.Sprintf("https://nominatim.openstreetmap.org/search?format=json&limit=1&q=%s", url.QueryEscape(location))
	
	var results []struct {
		Lat string `json:"lat"`
		Lon string `json:"lon"`
	}
	
	if err := g.Client.FetchJSON(ctx, query, &results); err != nil {
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

