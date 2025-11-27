package utils

import (
	"strings"
)

// PrettifyLocation formate une localisation brute en format lisible
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

