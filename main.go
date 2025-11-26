package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"net/url"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	baseAPIURL     = "https://groupietrackers.herokuapp.com/api"
	readTimeout    = 10 * time.Second
	userAgentValue = "GroupieTrackerStudent/1.0 (ynov project)"
)

type apiIndex struct {
	ArtistsURL   string `json:"artists"`
	LocationsURL string `json:"locations"`
	DatesURL     string `json:"dates"`
	RelationURL  string `json:"relation"`
}

type apiArtist struct {
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

type apiRelation struct {
	ID             int                 `json:"id"`
	DatesLocations map[string][]string `json:"datesLocations"`
}

type coordinates struct {
	Latitude  float64 `json:"lat"`
	Longitude float64 `json:"lng"`
}

type concert struct {
	Location        string       `json:"location"`
	DisplayLocation string       `json:"displayLocation"`
	Dates           []string     `json:"dates"`
	Coordinates     *coordinates `json:"coordinates,omitempty"`
}

type artist struct {
	ID             int       `json:"id"`
	Name           string    `json:"name"`
	Image          string    `json:"image"`
	Members        []string  `json:"members"`
	CreationDate   int       `json:"creationDate"`
	FirstAlbum     string    `json:"firstAlbum"`
	FirstAlbumYear int       `json:"firstAlbumYear"`
	Concerts       []concert `json:"concerts"`
	Tags           []string  `json:"tags"`
}

type filterMeta struct {
	CreationMin int
	CreationMax int
	AlbumMin    int
	AlbumMax    int
	MembersMin  int
	MembersMax  int
	Locations   []string
}

type homePageData struct {
	ArtistsJSON template.JS
	FilterMeta  filterMeta
}

type artistPageData struct {
	Artist artist
}

type filterCriteria struct {
	CreationMin int
	CreationMax int
	AlbumMin    int
	AlbumMax    int
	MembersMin  int
	MembersMax  int
	Locations   map[string]struct{}
}

type app struct {
	client     *http.Client
	templates  map[string]*template.Template
	mu         sync.RWMutex
	artists    []artist
	locations  []string
	geoCache   map[string]coordinates
	geoCacheMu sync.RWMutex
}

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}

func run() error {
	funcMap := template.FuncMap{
		"join": strings.Join,
		"toJSON": func(v interface{}) template.JS {
			data, err := json.Marshal(v)
			if err != nil {
				return ""
			}
			return template.JS(string(data))
		},
	}

	tmplSet, err := loadTemplates(funcMap)
	if err != nil {
		return fmt.Errorf("chargement des templates: %w", err)
	}

	a := &app{
		client: &http.Client{
			Timeout: readTimeout,
		},
		templates: tmplSet,
		geoCache:  make(map[string]coordinates),
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := a.refreshData(ctx); err != nil {
		return err
	}

	mux := http.NewServeMux()
	mux.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))
	mux.HandleFunc("/", a.handleHome)
	mux.HandleFunc("/artist", a.handleArtist)
	mux.HandleFunc("/api/artists", a.handleArtistsAPI)
	mux.HandleFunc("/api/filter", a.handleFilterAPI)
	mux.HandleFunc("/api/refresh", a.handleRefreshAPI)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      loggingMiddleware(mux),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
	}

	log.Printf("Serveur disponible sur http://localhost:%s\n", port)
	return server.ListenAndServe()
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s (%s)", r.Method, r.URL.Path, time.Since(start))
	})
}

func (a *app) handleHome(w http.ResponseWriter, r *http.Request) {
	artists := a.getArtists()
	jsonPayload, err := json.Marshal(artists)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "impossible de charger les artistes")
		return
	}

	meta := buildFilterMeta(artists, a.locations)

	data := homePageData{
		ArtistsJSON: template.JS(string(jsonPayload)),
		FilterMeta:  meta,
	}

	a.renderTemplate(w, "home.html", data)
}

func (a *app) handleArtist(w http.ResponseWriter, r *http.Request) {
	idStr := r.URL.Query().Get("id")
	if idStr == "" {
		respondError(w, http.StatusBadRequest, "id d'artiste manquant")
		return
	}
	id, err := strconv.Atoi(idStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "id invalide")
		return
	}

	art, ok := a.findArtistByID(id)
	if !ok {
		respondError(w, http.StatusNotFound, "artiste introuvable")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 25*time.Second)
	defer cancel()

	for i := range art.Concerts {
		loc := art.Concerts[i].DisplayLocation
		coords, err := a.lookupCoordinates(ctx, loc)
		if err != nil {
			rawFallback := strings.ReplaceAll(art.Concerts[i].Location, "-", " ")
			coords, err = a.lookupCoordinates(ctx, rawFallback)
		}
		if err != nil {
			log.Printf("geocode %s: %v", loc, err)
			continue
		}
		art.Concerts[i].Coordinates = coords
	}

	a.renderTemplate(w, "artist.html", artistPageData{Artist: art})
}

func (a *app) handleArtistsAPI(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, a.getArtists())
}

func (a *app) handleFilterAPI(w http.ResponseWriter, r *http.Request) {
	criteria := parseFilterCriteria(r)
	artists := a.getArtists()
	filtered := filterArtists(artists, criteria)
	respondJSON(w, filtered)
}

func (a *app) handleRefreshAPI(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	if err := a.refreshData(ctx); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondJSON(w, map[string]string{"status": "ok"})
}

func (a *app) refreshData(ctx context.Context) error {
	indexURL := baseAPIURL
	var index apiIndex
	if err := a.fetchJSON(ctx, indexURL, &index); err != nil {
		return fmt.Errorf("index api: %w", err)
	}

	var remoteArtists []apiArtist
	if err := a.fetchJSON(ctx, index.ArtistsURL, &remoteArtists); err != nil {
		return fmt.Errorf("chargement artistes: %w", err)
	}

	out := make([]artist, len(remoteArtists))
	errCh := make(chan error, len(remoteArtists))
	var wg sync.WaitGroup

	for i, apiArt := range remoteArtists {
		wg.Add(1)
		go func(idx int, data apiArtist) {
			defer wg.Done()
			var rel apiRelation
			if err := a.fetchJSON(ctx, data.RelationsURL, &rel); err != nil {
				errCh <- fmt.Errorf("relation artiste %d: %w", data.ID, err)
				return
			}
			out[idx] = combineArtist(data, rel)
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

	a.mu.Lock()
	a.artists = out
	a.locations = locations
	a.mu.Unlock()

	return nil
}

func (a *app) fetchJSON(ctx context.Context, url string, target interface{}) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", userAgentValue)

	resp, err := a.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("appel %s: statut %d", url, resp.StatusCode)
	}
	return json.NewDecoder(resp.Body).Decode(target)
}

func combineArtist(apiData apiArtist, rel apiRelation) artist {
	concerts := make([]concert, 0, len(rel.DatesLocations))
	for raw, dates := range rel.DatesLocations {
		concerts = append(concerts, concert{
			Location:        raw,
			DisplayLocation: prettifyLocation(raw),
			Dates:           dates,
		})
	}
	sort.Slice(concerts, func(i, j int) bool {
		return concerts[i].DisplayLocation < concerts[j].DisplayLocation
	})

	firstAlbumYear := parseYear(apiData.FirstAlbum)

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

	return artist{
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

func buildFilterMeta(artists []artist, locations []string) filterMeta {
	meta := filterMeta{
		CreationMin: mathOrDefault(len(artists), func() int {
			min := artists[0].CreationDate
			for _, a := range artists {
				if a.CreationDate < min {
					min = a.CreationDate
				}
			}
			return min
		}),
		CreationMax: mathOrDefault(len(artists), func() int {
			max := artists[0].CreationDate
			for _, a := range artists {
				if a.CreationDate > max {
					max = a.CreationDate
				}
			}
			return max
		}),
		AlbumMin: mathOrDefault(len(artists), func() int {
			min := artists[0].FirstAlbumYear
			for _, a := range artists {
				if a.FirstAlbumYear < min {
					min = a.FirstAlbumYear
				}
			}
			return min
		}),
		AlbumMax: mathOrDefault(len(artists), func() int {
			max := artists[0].FirstAlbumYear
			for _, a := range artists {
				if a.FirstAlbumYear > max {
					max = a.FirstAlbumYear
				}
			}
			return max
		}),
		MembersMin: mathOrDefault(len(artists), func() int {
			min := len(artists[0].Members)
			for _, a := range artists {
				if len(a.Members) < min {
					min = len(a.Members)
				}
			}
			return min
		}),
		MembersMax: mathOrDefault(len(artists), func() int {
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
	return meta
}

func mathOrDefault(length int, fn func() int) int {
	if length == 0 {
		return 0
	}
	return fn()
}

func (a *app) getArtists() []artist {
	a.mu.RLock()
	defer a.mu.RUnlock()
	cp := make([]artist, len(a.artists))
	copy(cp, a.artists)
	return cp
}

func (a *app) findArtistByID(id int) (artist, bool) {
	a.mu.RLock()
	defer a.mu.RUnlock()
	for _, art := range a.artists {
		if art.ID == id {
			return art, true
		}
	}
	return artist{}, false
}

func parseFilterCriteria(r *http.Request) filterCriteria {
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

	return filterCriteria{
		CreationMin: creationMin,
		CreationMax: creationMax,
		AlbumMin:    albumMin,
		AlbumMax:    albumMax,
		MembersMin:  membersMin,
		MembersMax:  membersMax,
		Locations:   locSet,
	}
}

func filterArtists(artists []artist, criteria filterCriteria) []artist {
	var result []artist
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

func matchesLocations(art artist, wanted map[string]struct{}) bool {
	for _, concert := range art.Concerts {
		if _, ok := wanted[concert.DisplayLocation]; ok {
			return true
		}
	}
	return false
}

func loadTemplates(funcMap template.FuncMap) (map[string]*template.Template, error) {
	pages := []string{"home.html", "artist.html"}
	result := make(map[string]*template.Template, len(pages))
	for _, page := range pages {
		files := []string{"templates/layout.html", "templates/" + page}
		tmpl, err := template.New("layout").Funcs(funcMap).ParseFiles(files...)
		if err != nil {
			return nil, fmt.Errorf("template %s: %w", page, err)
		}
		result[page] = tmpl
	}
	return result, nil
}

func (a *app) renderTemplate(w http.ResponseWriter, name string, data interface{}) {
	tmpl, ok := a.templates[name]
	if !ok {
		respondError(w, http.StatusInternalServerError, "template manquant")
		return
	}
	if err := tmpl.ExecuteTemplate(w, name, data); err != nil {
		log.Printf("template %s: %v", name, err)
	}
}

func respondJSON(w http.ResponseWriter, payload interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Println("json encode:", err)
	}
}

func respondError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}

func parseYear(value string) int {
	if value == "" {
		return 0
	}
	parts := strings.Split(value, "-")
	if len(parts) != 3 {
		return 0
	}
	year, err := strconv.Atoi(parts[2])
	if err != nil {
		return 0
	}
	return year
}

func prettifyLocation(raw string) string {
	replaced := strings.ReplaceAll(raw, "_", " ")
	segments := strings.Split(replaced, "-")
	for i, segment := range segments {
		clean := strings.TrimSpace(segment)
		clean = strings.Join(strings.Fields(clean), " ")
		if len(clean) <= 3 {
			clean = strings.ToUpper(clean)
		} else {
			clean = strings.Title(clean)
		}
		segments[i] = clean
	}
	return strings.Join(segments, ", ")
}

func (a *app) lookupCoordinates(ctx context.Context, location string) (*coordinates, error) {
	key := strings.ToLower(location)
	a.geoCacheMu.RLock()
	if coords, ok := a.geoCache[key]; ok {
		a.geoCacheMu.RUnlock()
		return &coords, nil
	}
	a.geoCacheMu.RUnlock()

	coords, err := a.geocode(ctx, location)
	if err != nil {
		return nil, err
	}

	a.geoCacheMu.Lock()
	a.geoCache[key] = *coords
	a.geoCacheMu.Unlock()

	return coords, nil
}

func (a *app) geocode(ctx context.Context, location string) (*coordinates, error) {
	query := fmt.Sprintf("https://nominatim.openstreetmap.org/search?format=json&limit=1&q=%s", url.QueryEscape(location))
	var results []struct {
		Lat string `json:"lat"`
		Lon string `json:"lon"`
	}
	if err := a.fetchJSON(ctx, query, &results); err != nil {
		return nil, err
	}
	if len(results) == 0 {
		return nil, errors.New("aucune coordonnée")
	}
	lat, err := strconv.ParseFloat(results[0].Lat, 64)
	if err != nil {
		return nil, err
	}
	lon, err := strconv.ParseFloat(results[0].Lon, 64)
	if err != nil {
		return nil, err
	}
	return &coordinates{Latitude: lat, Longitude: lon}, nil
}
