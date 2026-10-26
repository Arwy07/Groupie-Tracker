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

	"groupie/src/go/config"
	"groupie/src/go/geo"
	"groupie/src/go/models"
)

type Client struct {
	HTTPClient *http.Client
}

func NewClient(httpClient *http.Client) *Client {
	return &Client{
		HTTPClient: httpClient,
	}
}

func (c *Client) FetchJSON(ctx context.Context, url string, target interface{}) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", config.UserAgentValue)

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("appel %s: statut %d", url, resp.StatusCode)
	}

	return json.NewDecoder(resp.Body).Decode(target)
}

func (c *Client) FetchIndex(ctx context.Context) (*models.APIIndex, error) {
	var index models.APIIndex
	if err := c.FetchJSON(ctx, config.BaseAPIURL, &index); err != nil {
		return nil, fmt.Errorf("index api: %w", err)
	}
	return &index, nil
}

func (c *Client) FetchArtists(ctx context.Context, artistsURL string) ([]models.APIArtist, error) {
	var artists []models.APIArtist
	if err := c.FetchJSON(ctx, artistsURL, &artists); err != nil {
		return nil, fmt.Errorf("chargement artistes: %w", err)
	}
	return artists, nil
}

func (c *Client) FetchRelations(ctx context.Context, relationsURL string) (*models.APIRelation, error) {
	var relation models.APIRelation
	if err := c.FetchJSON(ctx, relationsURL, &relation); err != nil {
		return nil, fmt.Errorf("relation: %w", err)
	}
	return &relation, nil
}

type GeocodeService struct {
	Client  *Client
	Cache   map[string]models.Coordinates
	CacheMu sync.RWMutex
}

func NewGeocodeService(client *Client) *GeocodeService {
	return &GeocodeService{
		Client: client,
		Cache:  make(map[string]models.Coordinates),
	}
}

func (g *GeocodeService) LookupCoordinates(ctx context.Context, location string) (*models.Coordinates, error) {
	key := strings.ToLower(location)

	// 1. Vérifier le cache en mémoire
	g.CacheMu.RLock()
	if coords, ok := g.Cache[key]; ok {
		g.CacheMu.RUnlock()
		return &coords, nil
	}
	g.CacheMu.RUnlock()

	// 2. Vérifier le cache de lieux prédéfinis (instantané)
	if coords, ok := geo.GetVenueCoordinates(location); ok {
		g.CacheMu.Lock()
		g.Cache[key] = *coords
		g.CacheMu.Unlock()
		return coords, nil
	}

	// 3. Fallback: API Nominatim (lent)
	coords, err := g.geocode(ctx, location)
	if err != nil {
		return nil, err
	}

	g.CacheMu.Lock()
	g.Cache[key] = *coords
	g.CacheMu.Unlock()

	return coords, nil
}

func (g *GeocodeService) geocode(ctx context.Context, location string) (*models.Coordinates, error) {
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
