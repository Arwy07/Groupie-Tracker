package game

import (
	"testing"

	"groupie/src/models"
)

func sampleArtists() []models.Artist {
	return []models.Artist{
		{
			ID:             1,
			Name:           "Alpha",
			CreationDate:   1980,
			FirstAlbum:     "01-01-1985",
			FirstAlbumYear: 1985,
			Members:        []string{"A", "B"},
			Concerts: []models.Concert{
				{DisplayLocation: "Paris, France"},
				{DisplayLocation: "Berlin, Germany"},
			},
		},
		{
			ID:             2,
			Name:           "Beta",
			CreationDate:   2000,
			FirstAlbum:     "10-10-2002",
			FirstAlbumYear: 2002,
			Members:        []string{"C", "D", "E", "F"},
			Concerts: []models.Concert{
				{DisplayLocation: "Lyon, France"},
			},
		},
	}
}

func TestFilterArtistsByCreation(t *testing.T) {
	artists := sampleArtists()
	criteria := models.FilterCriteria{CreationMax: 1990}
	got := FilterArtists(artists, criteria)
	if len(got) != 1 || got[0].ID != 1 {
		t.Fatalf("expected artist Alpha, got %#v", got)
	}
}

func TestFilterArtistsByLocations(t *testing.T) {
	artists := sampleArtists()
	criteria := models.FilterCriteria{
		Locations: map[string]struct{}{"Lyon, France": {}},
	}
	got := FilterArtists(artists, criteria)
	if len(got) != 1 || got[0].ID != 2 {
		t.Fatalf("expected artist Beta, got %#v", got)
	}
}


