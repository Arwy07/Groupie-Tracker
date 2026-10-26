package home

import (
	"encoding/json"
	"html/template"
	"net/http"

	"groupie/src/go/db"
	"groupie/src/go/game"
	"groupie/src/go/models"
	"groupie/src/go/session"
	"groupie/src/go/templates"
)

type HomeHandler struct {
	DataService *game.DataService
	Templates   map[string]*template.Template
}

func NewHomeHandler(dataService *game.DataService, tmpls map[string]*template.Template) *HomeHandler {
	return &HomeHandler{
		DataService: dataService,
		Templates:   tmpls,
	}
}

func (h *HomeHandler) Handle(w http.ResponseWriter, r *http.Request) {
	artists := h.DataService.GetArtists()

	user, err := session.GetUserFromRequest(r)
	favSet := make(map[int]struct{}) // struct{} utilise 0 bytes vs bool qui utilise 1 byte
	if err == nil {
		rows, err := db.DB.Query("SELECT artist_id FROM favorites WHERE user_id = ?", user.ID)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var fid int
				if err := rows.Scan(&fid); err == nil {
					favSet[fid] = struct{}{}
				}
			}
		}
	}

	displayArtists := make([]models.Artist, len(artists))
	copy(displayArtists, artists)

	// Marquer les favoris
	for i := range displayArtists {
		_, displayArtists[i].IsFavorite = favSet[displayArtists[i].ID]
	}

	// Trier: favoris en premier (une seule passe)
	if len(favSet) > 0 {
		favorites := make([]models.Artist, 0, len(favSet))
		others := make([]models.Artist, 0, len(displayArtists)-len(favSet))
		for _, a := range displayArtists {
			if a.IsFavorite {
				favorites = append(favorites, a)
			} else {
				others = append(others, a)
			}
		}
		displayArtists = append(favorites, others...)
	}

	jsonPayload, err := json.Marshal(displayArtists)
	if err != nil {
		http.Error(w, "impossible de charger les artistes", http.StatusInternalServerError)
		return
	}

	meta := game.BuildFilterMeta(displayArtists, h.DataService.App.Locations)

	data := map[string]interface{}{
		"ArtistsJSON": template.JS(string(jsonPayload)),
		"FilterMeta":  meta,
	}

	if user != nil {
		data["User"] = user
	}

	templates.RenderTemplate(w, h.Templates, "home.html", data)
}
