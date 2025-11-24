package main

import "testing"

func sampleArtists() []artist {
	return []artist{
		{
			ID:             1,
			Name:           "Alpha",
			CreationDate:   1980,
			FirstAlbum:     "01-01-1985",
			FirstAlbumYear: 1985,
			Members:        []string{"A", "B"},
			Concerts: []concert{
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
			Concerts: []concert{
				{DisplayLocation: "Lyon, France"},
			},
		},
	}
}

func TestFilterArtistsByCreation(t *testing.T) {
	artists := sampleArtists()
	criteria := filterCriteria{CreationMax: 1990}
	got := filterArtists(artists, criteria)
	if len(got) != 1 || got[0].ID != 1 {
		t.Fatalf("expected artist Alpha, got %#v", got)
	}
}

func TestFilterArtistsByLocations(t *testing.T) {
	artists := sampleArtists()
	criteria := filterCriteria{
		Locations: map[string]struct{}{"Lyon, France": {}},
	}
	got := filterArtists(artists, criteria)
	if len(got) != 1 || got[0].ID != 2 {
		t.Fatalf("expected artist Beta, got %#v", got)
	}
}

func TestParseYear(t *testing.T) {
	if parseYear("05-12-1999") != 1999 {
		t.Fatal("expected 1999")
	}
	if parseYear("invalid") != 0 {
		t.Fatal("invalid input should return 0")
	}
}
