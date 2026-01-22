package models

import (
	"html/template"
	"net/http"
	"sync"
	"time"
)

type User struct {
	ID        int       `json:"id"`
	Email     string    `json:"email"`
	Password  string    `json:"-"`
	FirstName string    `json:"first_name"`
	LastName  string    `json:"last_name"`
	Avatar    string    `json:"avatar"`
	IsAdmin   bool      `json:"is_admin"`
	IsOwner   bool      `json:"is_owner"`
	CreatedAt time.Time `json:"created_at"`
}

type LoginCredentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RegisterCredentials struct {
	Email           string `json:"email"`
	Password        string `json:"password"`
	ConfirmPassword string `json:"confirm_password"`
}

type Artist struct {
	ID             int       `json:"id"`
	Name           string    `json:"name"`
	Image          string    `json:"image"`
	Members        []string  `json:"members"`
	CreationDate   int       `json:"creationDate"`
	FirstAlbum     string    `json:"firstAlbum"`
	FirstAlbumYear int       `json:"firstAlbumYear"`
	Concerts       []Concert `json:"concerts"`
	Tags           []string  `json:"tags"`
	IsFavorite     bool      `json:"isFavorite"`
}

type Concert struct {
	Location        string       `json:"location"`
	DisplayLocation string       `json:"displayLocation"`
	Dates           []string     `json:"dates"`
	Coordinates     *Coordinates `json:"coordinates,omitempty"`
}

type Coordinates struct {
	Latitude  float64 `json:"lat"`
	Longitude float64 `json:"lng"`
}

type APIIndex struct {
	ArtistsURL   string `json:"artists"`
	LocationsURL string `json:"locations"`
	DatesURL     string `json:"dates"`
	RelationURL  string `json:"relation"`
}

type APIArtist struct {
	ID           int      `json:"id"`
	Image        string   `json:"image"`
	Name         string   `json:"name"`
	Members      []string `json:"members"`
	CreationDate int      `json:"creationDate"`
	FirstAlbum   string   `json:"firstAlbum"`
	LocationsURL string   `json:"locations"`
	DatesURL     string   `json:"concertDates"`
	RelationsURL string   `json:"relations"`
}

type APIRelation struct {
	ID             int                 `json:"id"`
	DatesLocations map[string][]string `json:"datesLocations"`
}

type App struct {
	Client     *http.Client
	Templates  map[string]*template.Template
	Mu         sync.RWMutex
	Artists    []Artist
	Locations  []string
	GeoCache   map[string]Coordinates
	GeoCacheMu sync.RWMutex
}

type FilterMeta struct {
	CreationMin int
	CreationMax int
	AlbumMin    int
	AlbumMax    int
	MembersMin  int
	MembersMax  int
	Locations   []string
}

type FilterCriteria struct {
	CreationMin int
	CreationMax int
	AlbumMin    int
	AlbumMax    int
	MembersMin  int
	MembersMax  int
	Locations   map[string]struct{}
}

type HomePageData struct {
	ArtistsJSON template.JS
	FilterMeta  FilterMeta
}

type ArtistPageData struct {
	Artist     Artist
	ArtistJSON template.JS
}

