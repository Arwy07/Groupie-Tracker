package game

import (
	"context"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"

	"groupie/src/go/api"
	"groupie/src/go/geo"
	"groupie/src/go/models"
	"groupie/src/go/utils"
)

type DataService struct {
	App    *models.App
	Client *api.Client
}

func NewDataService(app *models.App, client *api.Client) *DataService {
	return &DataService{
		App:    app,
		Client: client,
	}
}

func (d *DataService) RefreshData(ctx context.Context) error {
	index, err := d.Client.FetchIndex(ctx)
	if err != nil {
		return fmt.Errorf("index api: %w", err)
	}

	remoteArtists, err := d.Client.FetchArtists(ctx, index.ArtistsURL)
	if err != nil {
		return fmt.Errorf("chargement artistes: %w", err)
	}

	out := make([]models.Artist, len(remoteArtists))
	errCh := make(chan error, len(remoteArtists))
	var wg sync.WaitGroup

	for i, apiArt := range remoteArtists {
		wg.Add(1)
		go func(idx int, data models.APIArtist) {
			defer wg.Done()
			rel, err := d.Client.FetchRelations(ctx, data.RelationsURL)
			if err != nil {
				errCh <- fmt.Errorf("relation artiste %d: %w", data.ID, err)
				return
			}
			out[idx] = CombineArtist(data, *rel)
		}(i, apiArt)
	}

	wg.Wait()
	close(errCh)
	if len(errCh) > 0 {
		return <-errCh
	}

	sort.Slice(out, func(i, j int) bool {
		return strings.ToLower(out[i].Name) < strings.ToLower(out[j].Name)
	})

	locationSet := map[string]struct{}{}
	for _, art := range out {
		for _, c := range art.Concerts {
			locationSet[c.DisplayLocation] = struct{}{}
		}
	}

	locations := make([]string, 0, len(locationSet))
	for loc := range locationSet {
		locations = append(locations, loc)
	}
	sort.Strings(locations)

	d.App.Mu.Lock()
	d.App.Artists = out
	d.App.Locations = locations
	d.App.Mu.Unlock()

	return nil
}

func (d *DataService) GetArtists() []models.Artist {
	d.App.Mu.RLock()
	defer d.App.Mu.RUnlock()
	cp := make([]models.Artist, len(d.App.Artists))
	copy(cp, d.App.Artists)
	return cp
}

func (d *DataService) UpdateArtists(artists []models.Artist) {
	d.App.Mu.Lock()
	d.App.Artists = artists
	d.App.Mu.Unlock()
}

func (d *DataService) FindArtistByID(id int) (models.Artist, bool) {
	d.App.Mu.RLock()
	defer d.App.Mu.RUnlock()
	// Recherche binaire ou directe si les IDs sont contigus
	if id > 0 && id <= len(d.App.Artists) {
		art := d.App.Artists[id-1]
		if art.ID == id {
			return art, true
		}
	}
	// Fallback: recherche linéaire
	for _, art := range d.App.Artists {
		if art.ID == id {
			return art, true
		}
	}
	return models.Artist{}, false
}

func CombineArtist(apiData models.APIArtist, rel models.APIRelation) models.Artist {
	concerts := make([]models.Concert, 0, len(rel.DatesLocations))

	for raw, dates := range rel.DatesLocations {
		displayLoc := utils.PrettifyLocation(raw)
		concert := models.Concert{
			Location:        raw,
			DisplayLocation: displayLoc,
			Dates:           dates,
		}

		// Pré-charger les coordonnées depuis le cache de lieux connus
		if coords, ok := geo.GetVenueCoordinates(displayLoc); ok {
			concert.Coordinates = coords
		} else if coords, ok := geo.GetVenueCoordinates(raw); ok {
			concert.Coordinates = coords
		}

		concerts = append(concerts, concert)
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

func BuildFilterMeta(artists []models.Artist, locations []string) models.FilterMeta {
	if len(artists) == 0 {
		return models.FilterMeta{Locations: locations}
	}

	// Calcul en une seule passe au lieu de 6
	creationMin, creationMax := artists[0].CreationDate, artists[0].CreationDate
	albumMin, albumMax := artists[0].FirstAlbumYear, artists[0].FirstAlbumYear
	membersMin, membersMax := len(artists[0].Members), len(artists[0].Members)

	for _, a := range artists[1:] {
		if a.CreationDate < creationMin {
			creationMin = a.CreationDate
		}
		if a.CreationDate > creationMax {
			creationMax = a.CreationDate
		}
		if a.FirstAlbumYear < albumMin {
			albumMin = a.FirstAlbumYear
		}
		if a.FirstAlbumYear > albumMax {
			albumMax = a.FirstAlbumYear
		}
		memberCount := len(a.Members)
		if memberCount < membersMin {
			membersMin = memberCount
		}
		if memberCount > membersMax {
			membersMax = memberCount
		}
	}

	return models.FilterMeta{
		CreationMin: creationMin,
		CreationMax: creationMax,
		AlbumMin:    albumMin,
		AlbumMax:    albumMax,
		MembersMin:  membersMin,
		MembersMax:  membersMax,
		Locations:   locations,
	}
}

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

func FilterArtists(artists []models.Artist, criteria models.FilterCriteria) []models.Artist {
	result := make([]models.Artist, 0, len(artists)/2) // Pré-allocation estimée

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

func matchesLocations(art models.Artist, wanted map[string]struct{}) bool {
	for _, concert := range art.Concerts {
		if _, ok := wanted[concert.DisplayLocation]; ok {
			return true
		}
	}
	return false
}
