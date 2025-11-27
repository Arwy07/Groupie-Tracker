package game

import (
	"sort"
	"strings"

	"groupie/src/models"
	"groupie/src/support/utils"
)

// CombineArtist combine les données API d'un artiste avec ses relations
func CombineArtist(apiData models.APIArtist, rel models.APIRelation) models.Artist {
	concerts := make([]models.Concert, 0, len(rel.DatesLocations))
	
	for raw, dates := range rel.DatesLocations {
		concerts = append(concerts, models.Concert{
			Location:        raw,
			DisplayLocation: utils.PrettifyLocation(raw),
			Dates:           dates,
		})
	}
	
	sort.Slice(concerts, func(i, j int) bool {
		return concerts[i].DisplayLocation < concerts[j].DisplayLocation
	})

	firstAlbumYear := utils.ParseYear(apiData.FirstAlbum)

	tagSet := map[string]struct{}{}
	for _, m := range apiData.Members {
		chunks := strings.Fields(m)
		if len(chunks) > 0 {
			tagSet[strings.ToLower(chunks[len(chunks)-1])] = struct{}{}
		}
	}
	
	tags := make([]string, 0, len(tagSet))
	for t := range tagSet {
		tags = append(tags, t)
	}
	sort.Strings(tags)

	return models.Artist{
		ID:             apiData.ID,
		Name:           apiData.Name,
		Image:          apiData.Image,
		Members:        apiData.Members,
		CreationDate:   apiData.CreationDate,
		FirstAlbum:     apiData.FirstAlbum,
		FirstAlbumYear: firstAlbumYear,
		Concerts:       concerts,
		Tags:           tags,
	}
}


