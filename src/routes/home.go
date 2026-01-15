package routes

import (
	"encoding/json"
	"html/template"
	"net/http"

	"groupie/src/game"
	"groupie/src/models"
	"groupie/src/support/db"
	"groupie/src/support/session"
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

	// Gestion des favoris si connecté
	user, err := session.GetUserFromRequest(r)
	var favSet = make(map[int]bool)
	if err == nil {
		rows, err := db.DB.Query("SELECT artist_id FROM favorites WHERE user_id = ?", user.ID)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var fid int
				rows.Scan(&fid)
				favSet[fid] = true
			}
		}
	}

	// Créer une copie pour ne pas modifier le cache global
	displayArtists := make([]models.Artist, len(artists))
	copy(displayArtists, artists)

	// Marquer les favoris
	for i := range displayArtists {
		if favSet[displayArtists[i].ID] {
			displayArtists[i].IsFavorite = true
		} else {
			displayArtists[i].IsFavorite = false
		}
	}

	// Trier: favoris en premier
	// On utilise un tri stable ou simple partition si on veut garder l'ordre alphabétique relatif
	if len(favSet) > 0 {
		filtered := make([]models.Artist, 0, len(displayArtists))
		// D'abord les favoris
		for _, a := range displayArtists {
			if a.IsFavorite {
				filtered = append(filtered, a)
			}
		}
		// Ensuite les autres
		for _, a := range displayArtists {
			if !a.IsFavorite {
				filtered = append(filtered, a)
			}
		}
		displayArtists = filtered
	}

	jsonPayload, err := json.Marshal(displayArtists)
	if err != nil {
		http.Error(w, "impossible de charger les artistes", http.StatusInternalServerError)
		return
	}

	meta := game.BuildFilterMeta(displayArtists, h.DataService.App.Locations)

	data := models.HomePageData{
		ArtistsJSON: template.JS(string(jsonPayload)),
		FilterMeta:  meta,
	}

	templates.RenderTemplate(w, h.Templates, "home.html", data)
}
