package routes

import (
	"html/template"
	"net/http"

	"groupie/src/support/templates"
)

// LandingHandler gère les requêtes pour la page d'accueil (landing page)
type LandingHandler struct {
	Templates map[string]*template.Template
}

// NewLandingHandler crée un nouveau gestionnaire pour la landing page
func NewLandingHandler(tmpls map[string]*template.Template) *LandingHandler {
	return &LandingHandler{
		Templates: tmpls,
	}
}

// Handle gère la requête pour la landing page
func (h *LandingHandler) Handle(w http.ResponseWriter, r *http.Request) {
	// Si l'URL n'est pas exactement "/", on renvoie 404 (pour éviter que tout match "/")
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	templates.RenderTemplate(w, h.Templates, "landing.html", nil)
}
