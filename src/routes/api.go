package routes

import (
	"context"
	"net/http"
	"time"

	"groupie/src/game"
	"groupie/src/support/utils"
)

// APIHandler gère les endpoints API
type APIHandler struct {
	DataService *game.DataService
}

// NewAPIHandler crée un nouveau gestionnaire API
func NewAPIHandler(dataService *game.DataService) *APIHandler {
	return &APIHandler{
		DataService: dataService,
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


