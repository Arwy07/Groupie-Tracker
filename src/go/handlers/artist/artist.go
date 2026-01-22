package artist

import (
	"context"
	"encoding/json"
	"html/template"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"groupie/src/go/api"
	"groupie/src/go/game"
	"groupie/src/go/session"
	"groupie/src/go/templates"
	"groupie/src/go/utils"
)

type ArtistHandler struct {
	DataService    *game.DataService
	GeocodeService *api.GeocodeService
	Templates      map[string]*template.Template
}

func NewArtistHandler(dataService *game.DataService, geocodeService *api.GeocodeService, tmpls map[string]*template.Template) *ArtistHandler {
	return &ArtistHandler{
		DataService:    dataService,
		GeocodeService: geocodeService,
		Templates:      tmpls,
	}
}

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

	jsonBytes, err := json.Marshal(art)
	if err != nil {
		log.Printf("json marshal error: %v", err)
	}

	data := map[string]interface{}{
		"Artist":     art,
		"ArtistJSON": template.JS(string(jsonBytes)),
	}
	
	user, err := session.GetUserFromRequest(r)
	if err == nil {
		data["User"] = user
	}

	templates.RenderTemplate(w, h.Templates, "artist.html", data)
}

