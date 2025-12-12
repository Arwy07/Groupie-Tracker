package templates

import (
	"encoding/json"
	"html/template"
	"strconv"
	"strings"
)

// GetFuncMap retourne la map de fonctions pour les templates
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
	}
}

