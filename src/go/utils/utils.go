package utils

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
)

func RespondJSON(w http.ResponseWriter, payload interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Println("json encode:", err)
	}
}

func RespondError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}

func PrettifyLocation(raw string) string {
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

func MathOrDefault(length int, fn func() int) int {
	if length == 0 {
		return 0
	}
	return fn()
}

func ParseYear(value string) int {
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

