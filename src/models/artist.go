package models

// Artist représente un artiste avec toutes ses informations
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
	IsFavorite     bool      `json:"isFavorite"` // Champ calculé, non présent dans l'API source
}

// Concert représente un concert avec ses dates et localisation
type Concert struct {
	Location        string       `json:"location"`
	DisplayLocation string       `json:"displayLocation"`
	Dates           []string     `json:"dates"`
	Coordinates     *Coordinates `json:"coordinates,omitempty"`
}

// Coordinates représente des coordonnées géographiques
type Coordinates struct {
	Latitude  float64 `json:"lat"`
	Longitude float64 `json:"lng"`
}
