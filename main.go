package main

import (
	"log"

	"groupie/src/routes"
	"groupie/src/support"
)

func main() {
	handler, err := routes.SetupRoutes()
	if err != nil {
		log.Fatal("Erreur d'initialisation:", err)
	}
	log.Fatal(support.StartServer(handler))
}
