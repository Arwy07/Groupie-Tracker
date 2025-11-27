package routes

import (
	"encoding/json"
	"html/template"
	"net/http"

	"groupie/src/game"
	"groupie/src/models"
	"groupie/src/support/templates"
)

// HomeHandler gère les requêtes pour la page d'accueil
type HomeHandler struct {
	DataService *game.DataService
	Templates   map[string]*template.Template
}

// NewHomeHandler crée un nouveau gestionnaire pour la page d'accueil
func NewHomeHandler(dataService *game.DataService, tmpls map[string]*template.Template) *HomeHandler {
	return &HomeHandler{
		DataService: dataService,
		Templates:   tmpls,
	}
}

// Handle gère la requête pour la page d'accueil
func (h *HomeHandler) Handle(w http.ResponseWriter, r *http.Request) {
	artists := h.DataService.GetArtists()
	jsonPayload, err := json.Marshal(artists)
	if err != nil {
		http.Error(w, "impossible de charger les artistes", http.StatusInternalServerError)
		return
	}

	meta := game.BuildFilterMeta(artists, h.DataService.App.Locations)

	data := models.HomePageData{
		ArtistsJSON: template.JS(string(jsonPayload)),
		FilterMeta:  meta,
	}

	templates.RenderTemplate(w, h.Templates, "home.html", data)
}

