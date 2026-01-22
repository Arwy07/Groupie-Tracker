package config

import (
	"os"
	"time"
)

const (
	BaseAPIURL    = "https://groupietrackers.herokuapp.com/api"
	ReadTimeout   = 10 * time.Second
	UserAgentValue = "GroupieTrackerStudent/1.0 (ynov project)"
)

func GetPort() string {
	port := os.Getenv("PORT")
	if port == "" {
		return "8080"
	}
	return port
}

