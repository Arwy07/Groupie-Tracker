package routes

import (
	"context"
	"html/template"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"groupie/src/api"
	"groupie/src/models"
	"groupie/src/game"
	"groupie/src/support/templates"
	"groupie/src/support/utils"
)

// ArtistHandler gère les requêtes pour la page d'un artiste
type ArtistHandler struct {
	DataService    *game.DataService
	GeocodeService *api.GeocodeService
	Templates      map[string]*template.Template
}

// NewArtistHandler crée un nouveau gestionnaire pour la page d'un artiste
func NewArtistHandler(dataService *game.DataService, geocodeService *api.GeocodeService, tmpls map[string]*template.Template) *ArtistHandler {
	return &ArtistHandler{
		DataService:    dataService,
		GeocodeService: geocodeService,
		Templates:      tmpls,
	}
}

// Handle gère la requête pour la page d'un artiste
func (h *ArtistHandler) Handle(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	if idStr == "" {
		utils.RespondError(w, http.StatusBadRequest, "id d'artiste manquant")
		return
	}
	
	id, err := strconv.Atoi(idStr)
	if err != nil {
		utils.RespondError(w, http.StatusBadRequest, "id invalide")
		return
	}

	art, ok := h.DataService.FindArtistByID(id)
	if !ok {
		utils.RespondError(w, http.StatusNotFound, "artiste introuvable")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 25*time.Second)
	defer cancel()

	for i := range art.Concerts {
		loc := art.Concerts[i].DisplayLocation
		coords, err := h.GeocodeService.LookupCoordinates(ctx, loc)
		if err != nil {
			rawFallback := strings.ReplaceAll(art.Concerts[i].Location, "-", " ")
			coords, err = h.GeocodeService.LookupCoordinates(ctx, rawFallback)
		}
		if err != nil {
			log.Printf("geocode %s: %v", loc, err)
			continue
		}
		art.Concerts[i].Coordinates = coords
	}

	data := models.ArtistPageData{Artist: art}
	templates.RenderTemplate(w, h.Templates, "artist.html", data)
}


