package api

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"groupie/src/go/api"
	"groupie/src/go/game"
	"groupie/src/go/utils"
)

type APIHandler struct {
	DataService    *game.DataService
	GeocodeService *api.GeocodeService
}

func NewAPIHandler(dataService *game.DataService, geocodeService *api.GeocodeService) *APIHandler {
	return &APIHandler{
		DataService:    dataService,
		GeocodeService: geocodeService,
	}
}

func (h *APIHandler) HandleArtists(w http.ResponseWriter, r *http.Request) {
	artists := h.DataService.GetArtists()
	utils.RespondJSON(w, artists)
}

func (h *APIHandler) HandleFilter(w http.ResponseWriter, r *http.Request) {
	criteria := game.ParseFilterCriteria(r)
	artists := h.DataService.GetArtists()
	filtered := game.FilterArtists(artists, criteria)
	utils.RespondJSON(w, filtered)
}

func (h *APIHandler) HandleRefresh(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	if err := h.DataService.RefreshData(ctx); err != nil {
		utils.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.RespondJSON(w, map[string]string{"status": "ok"})
}

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
