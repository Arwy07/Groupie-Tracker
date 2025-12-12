package templates

import (
	"fmt"
	"html/template"
	"log"
	"net/http"
)

// LoadTemplates charge tous les templates avec les fonctions définies
func LoadTemplates() (map[string]*template.Template, error) {
	funcMap := GetFuncMap()
	pages := []string{"home.html", "artist.html"}
	result := make(map[string]*template.Template, len(pages))
	
	for _, page := range pages {
		var files []string
		if page == "home.html" {
			files = []string{"templates/layout/layout.html", "templates/home/home.html"}
		} else if page == "artist.html" {
			files = []string{"templates/layout/layout.html", "templates/artist/artist.html"}
		}
		tmpl, err := template.New("layout").Funcs(funcMap).ParseFiles(files...)
		if err != nil {
			return nil, fmt.Errorf("template %s: %w", page, err)
		}
		result[page] = tmpl
	}
	
	return result, nil
}

// RenderTemplate exécute un template avec les données fournies
func RenderTemplate(w http.ResponseWriter, templates map[string]*template.Template, name string, data interface{}) {
	tmpl, ok := templates[name]
	if !ok {
		http.Error(w, "template manquant", http.StatusInternalServerError)
		return
	}
	if err := tmpl.ExecuteTemplate(w, name, data); err != nil {
		log.Printf("template %s: %v", name, err)
	}
}

