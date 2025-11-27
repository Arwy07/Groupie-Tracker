package models

import "html/template"

// FilterMeta contient les métadonnées pour les filtres
type FilterMeta struct {
	CreationMin int
	CreationMax int
	AlbumMin    int
	AlbumMax    int
	MembersMin  int
	MembersMax  int
	Locations   []string
}

// FilterCriteria représente les critères de filtrage
type FilterCriteria struct {
	CreationMin int
	CreationMax int
	AlbumMin    int
	AlbumMax    int
	MembersMin  int
	MembersMax  int
	Locations   map[string]struct{}
}

// HomePageData contient les données pour la page d'accueil
type HomePageData struct {
	ArtistsJSON template.JS
	FilterMeta  FilterMeta
}

// ArtistPageData contient les données pour la page d'un artiste
type ArtistPageData struct {
	Artist Artist
}

