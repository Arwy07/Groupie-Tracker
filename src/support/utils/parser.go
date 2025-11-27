package utils

import (
	"strconv"
	"strings"
)

// ParseYear extrait l'année d'une date au format DD-MM-YYYY
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

