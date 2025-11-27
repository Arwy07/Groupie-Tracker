package models

import (
	"html/template"
	"net/http"
	"sync"
)

// App représente l'application principale avec son état
type App struct {
	Client     *http.Client
	Templates  map[string]*template.Template
	Mu         sync.RWMutex
	Artists    []Artist
	Locations  []string
	GeoCache   map[string]Coordinates
	GeoCacheMu sync.RWMutex
}

