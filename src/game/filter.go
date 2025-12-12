package game

import (
	"net/http"
	"strconv"
	"strings"

	"groupie/src/models"
	"groupie/src/support/utils"
)

// BuildFilterMeta construit les métadonnées pour les filtres
func BuildFilterMeta(artists []models.Artist, locations []string) models.FilterMeta {
	return models.FilterMeta{
		CreationMin: utils.MathOrDefault(len(artists), func() int {
			min := artists[0].CreationDate
			for _, a := range artists {
				if a.CreationDate < min {
					min = a.CreationDate
				}
			}
			return min
		}),
		CreationMax: utils.MathOrDefault(len(artists), func() int {
			max := artists[0].CreationDate
			for _, a := range artists {
				if a.CreationDate > max {
					max = a.CreationDate
				}
			}
			return max
		}),
		AlbumMin: utils.MathOrDefault(len(artists), func() int {
			min := artists[0].FirstAlbumYear
			for _, a := range artists {
				if a.FirstAlbumYear < min {
					min = a.FirstAlbumYear
				}
			}
			return min
		}),
		AlbumMax: utils.MathOrDefault(len(artists), func() int {
			max := artists[0].FirstAlbumYear
			for _, a := range artists {
				if a.FirstAlbumYear > max {
					max = a.FirstAlbumYear
				}
			}
			return max
		}),
		MembersMin: utils.MathOrDefault(len(artists), func() int {
			min := len(artists[0].Members)
			for _, a := range artists {
				if len(a.Members) < min {
					min = len(a.Members)
				}
			}
			return min
		}),
		MembersMax: utils.MathOrDefault(len(artists), func() int {
			max := len(artists[0].Members)
			for _, a := range artists {
				if len(a.Members) > max {
					max = len(a.Members)
				}
			}
			return max
		}),
		Locations: locations,
	}
}

// ParseFilterCriteria parse les critères de filtrage depuis une requête HTTP
func ParseFilterCriteria(r *http.Request) models.FilterCriteria {
	q := r.URL.Query()
	
	parse := func(key string) (int, bool) {
		val := strings.TrimSpace(q.Get(key))
		if val == "" {
			return 0, false
		}
		num, err := strconv.Atoi(val)
		if err != nil {
			return 0, false
		}
		return num, true
	}

	creationMin, _ := parse("creationMin")
	creationMax, _ := parse("creationMax")
	albumMin, _ := parse("albumMin")
	albumMax, _ := parse("albumMax")
	membersMin, _ := parse("membersMin")
	membersMax, _ := parse("membersMax")

	locationValues := q["location"]
	locSet := make(map[string]struct{})
	for _, loc := range locationValues {
		if loc == "" {
			continue
		}
		locSet[loc] = struct{}{}
	}

	return models.FilterCriteria{
		CreationMin: creationMin,
		CreationMax: creationMax,
		AlbumMin:    albumMin,
		AlbumMax:    albumMax,
		MembersMin:  membersMin,
		MembersMax:  membersMax,
		Locations:   locSet,
	}
}

// FilterArtists filtre les artistes selon les critères
func FilterArtists(artists []models.Artist, criteria models.FilterCriteria) []models.Artist {
	var result []models.Artist
	
	for _, art := range artists {
		if criteria.CreationMin != 0 && art.CreationDate < criteria.CreationMin {
			continue
		}
		if criteria.CreationMax != 0 && art.CreationDate > criteria.CreationMax {
			continue
		}
		if criteria.AlbumMin != 0 && art.FirstAlbumYear < criteria.AlbumMin {
			continue
		}
		if criteria.AlbumMax != 0 && art.FirstAlbumYear > criteria.AlbumMax {
			continue
		}
		
		memberCount := len(art.Members)
		if criteria.MembersMin != 0 && memberCount < criteria.MembersMin {
			continue
		}
		if criteria.MembersMax != 0 && memberCount > criteria.MembersMax {
			continue
		}
		
		if len(criteria.Locations) > 0 {
			if !matchesLocations(art, criteria.Locations) {
				continue
			}
		}
		
		result = append(result, art)
	}
	
	return result
}

// matchesLocations vérifie si un artiste correspond aux localisations demandées
func matchesLocations(art models.Artist, wanted map[string]struct{}) bool {
	for _, concert := range art.Concerts {
		if _, ok := wanted[concert.DisplayLocation]; ok {
			return true
		}
	}
	return false
}


