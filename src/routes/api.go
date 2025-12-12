package routes

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"groupie/src/api"
	"groupie/src/game"
	"groupie/src/support/utils"
)

// APIHandler gère les endpoints API
type APIHandler struct {
	DataService    *game.DataService
	GeocodeService *api.GeocodeService
}

// NewAPIHandler crée un nouveau gestionnaire API
func NewAPIHandler(dataService *game.DataService, geocodeService *api.GeocodeService) *APIHandler {
	return &APIHandler{
		DataService:    dataService,
		GeocodeService: geocodeService,
	}
}

// HandleArtists gère GET /api/artists
func (h *APIHandler) HandleArtists(w http.ResponseWriter, r *http.Request) {
	artists := h.DataService.GetArtists()
	utils.RespondJSON(w, artists)
}

// HandleFilter gère GET /api/filter
func (h *APIHandler) HandleFilter(w http.ResponseWriter, r *http.Request) {
	criteria := game.ParseFilterCriteria(r)
	artists := h.DataService.GetArtists()
	filtered := game.FilterArtists(artists, criteria)
	utils.RespondJSON(w, filtered)
}

// HandleRefresh gère POST /api/refresh
func (h *APIHandler) HandleRefresh(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	if err := h.DataService.RefreshData(ctx); err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.RespondJSON(w, map[string]string{"status": "ok"})
}

// HandleGeocode gère GET /api/geocode?location=...
func (h *APIHandler) HandleGeocode(w http.ResponseWriter, r *http.Request) {
	location := r.URL.Query().Get("location")
	if location == "" {
		utils.RespondError(w, http.StatusBadRequest, "paramètre 'location' manquant")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	coords, err := h.GeocodeService.LookupCoordinates(ctx, location)
	if err != nil {
		// Essayer avec le format brut si le format affiché échoue
		rawLocation := strings.ReplaceAll(location, "-", " ")
		coords, err = h.GeocodeService.LookupCoordinates(ctx, rawLocation)
		if err != nil {
			utils.RespondError(w, http.StatusNotFound, fmt.Sprintf("impossible de géocoder: %v", err))
			return
		}
	}

	utils.RespondJSON(w, map[string]interface{}{
		"lat": coords.Latitude,
		"lng": coords.Longitude,
	})
}


