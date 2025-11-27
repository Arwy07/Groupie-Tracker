package models

// APIIndex représente la structure de l'index de l'API
type APIIndex struct {
	ArtistsURL   string `json:"artists"`
	LocationsURL string `json:"locations"`
	DatesURL     string `json:"dates"`
	RelationURL  string `json:"relation"`
}

// APIArtist représente un artiste tel que retourné par l'API
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

// APIRelation représente les relations (concerts) d'un artiste
type APIRelation struct {
	ID             int                 `json:"id"`
	DatesLocations map[string][]string `json:"datesLocations"`
}

