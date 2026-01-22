package templates

import (
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"strconv"
	"strings"
)

func GetFuncMap() template.FuncMap {
	return template.FuncMap{
		"join": strings.Join,
		"add": func(a, b int) int {
			return a + b
		},
		"makeSlice": func() []string {
			return []string{}
		},
		"in": func(slice []string, item string) bool {
			for _, s := range slice {
				if s == item {
					return true
				}
			}
			return false
		},
		"append": func(slice []string, item string) []string {
			return append(slice, item)
		},
		"first": func(n int, slice interface{}) interface{} {
			switch v := slice.(type) {
			case []interface{}:
				if n > len(v) {
					n = len(v)
				}
				return v[:n]
			case []string:
				if n > len(v) {
					n = len(v)
				}
				return v[:n]
			default:
				return slice
			}
		},
		"formatDate": func(dateStr, format string) string {
			if len(dateStr) < 10 {
				return dateStr
			}
			parts := strings.Split(dateStr, "-")
			if len(parts) != 3 {
				return dateStr
			}
			switch format {
			case "02":
				return parts[2]
			case "Jan":
				months := []string{"", "Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"}
				if month, err := strconv.Atoi(parts[1]); err == nil && month >= 1 && month <= 12 {
					return months[month]
				}
				return parts[1]
			default:
				return dateStr
			}
		},
		"toJSON": func(v interface{}) template.JS {
			data, err := json.Marshal(v)
			if err != nil {
				return ""
			}
			return template.JS(string(data))
		},
		"mul": func(a, b interface{}) float64 {
			var af, bf float64
			switch v := a.(type) {
			case float64:
				af = v
			case int:
				af = float64(v)
			}
			switch v := b.(type) {
			case float64:
				bf = v
			case int:
				bf = float64(v)
			}
			return af * bf
		},
		"default": func(defaultVal, val interface{}) interface{} {
			if val == nil || val == "" {
				return defaultVal
			}
			return val
		},
	}
}

func LoadTemplates() (map[string]*template.Template, error) {
	funcMap := GetFuncMap()
	pages := []string{"home.html", "artist.html", "landing.html", "login.html", "register.html", "profile.html", "dashboard.html", "checkout.html", "terms.html"}
	result := make(map[string]*template.Template, len(pages))

	for _, page := range pages {
		var files []string
		if page == "home.html" {
			files = []string{"templates/layout/layout.html", "templates/home/home.html"}
		} else if page == "artist.html" {
			files = []string{"templates/layout/layout.html", "templates/artist/artist.html"}
		} else if page == "landing.html" {
			files = []string{"templates/layout/layout.html", "templates/landing/landing.html"}
		} else if page == "login.html" {
			files = []string{"templates/layout/layout.html", "templates/auth/login.html"}
		} else if page == "register.html" {
			files = []string{"templates/layout/layout.html", "templates/auth/register.html"}
		} else if page == "profile.html" {
			files = []string{"templates/layout/layout.html", "templates/user/profile.html"}
		} else if page == "dashboard.html" {
			files = []string{"templates/layout/layout.html", "templates/dashboard/dashboard.html"}
		} else if page == "checkout.html" {
			files = []string{"templates/layout/layout.html", "templates/checkout/checkout.html"}
		} else if page == "terms.html" {
			files = []string{"templates/layout/layout.html", "templates/terms/terms.html"}
		}
		tmpl, err := template.New("layout").Funcs(funcMap).ParseFiles(files...)
		if err != nil {
			return nil, fmt.Errorf("template %s: %w", page, err)
		}
		result[page] = tmpl
	}

	return result, nil
}

func RenderTemplate(w http.ResponseWriter, templates map[string]*template.Template, name string, data interface{}) {
	tmpl, ok := templates[name]
	if !ok {
		http.Error(w, "template manquant", http.StatusInternalServerError)
		return
	}
	if err := tmpl.ExecuteTemplate(w, name, data); err != nil {
		log.Printf("template %s: %v", name, err)
		http.Error(w, fmt.Sprintf("Erreur de rendu: %v", err), http.StatusInternalServerError)
	}
}

