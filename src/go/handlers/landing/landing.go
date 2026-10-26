package landing

import (
	"html/template"
	"net/http"

	"groupie/src/go/templates"
)

type LandingHandler struct {
	Templates map[string]*template.Template
}

func NewLandingHandler(tmpls map[string]*template.Template) *LandingHandler {
	return &LandingHandler{Templates: tmpls}
}

func (h *LandingHandler) Handle(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	templates.RenderTemplate(w, h.Templates, "landing.html", nil)
}

func (h *LandingHandler) HandleTerms(w http.ResponseWriter, r *http.Request) {
	data := map[string]interface{}{"Date": "2024"}
	templates.RenderTemplate(w, h.Templates, "terms.html", data)
}

