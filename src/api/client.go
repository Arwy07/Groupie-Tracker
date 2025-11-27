package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"groupie/src/config"
	"groupie/src/models"
)

// Client gère les appels à l'API externe
type Client struct {
	HTTPClient *http.Client
}

// NewClient crée un nouveau client API
func NewClient(httpClient *http.Client) *Client {
	return &Client{
		HTTPClient: httpClient,
	}
}

// FetchJSON récupère des données JSON depuis une URL
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

// FetchIndex récupère l'index de l'API
func (c *Client) FetchIndex(ctx context.Context) (*models.APIIndex, error) {
	var index models.APIIndex
	if err := c.FetchJSON(ctx, config.BaseAPIURL, &index); err != nil {
		return nil, fmt.Errorf("index api: %w", err)
	}
	return &index, nil
}

// FetchArtists récupère la liste des artistes
func (c *Client) FetchArtists(ctx context.Context, artistsURL string) ([]models.APIArtist, error) {
	var artists []models.APIArtist
	if err := c.FetchJSON(ctx, artistsURL, &artists); err != nil {
		return nil, fmt.Errorf("chargement artistes: %w", err)
	}
	return artists, nil
}

// FetchRelations récupère les relations d'un artiste
func (c *Client) FetchRelations(ctx context.Context, relationsURL string) (*models.APIRelation, error) {
	var relation models.APIRelation
	if err := c.FetchJSON(ctx, relationsURL, &relation); err != nil {
		return nil, fmt.Errorf("relation: %w", err)
	}
	return &relation, nil
}
