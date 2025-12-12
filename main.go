package main

import (
	"groupie/src/routes"
	"groupie/src/support"
	"log"
)

func main() {
	handler, err := routes.SetupRoutes()
	if err != nil {
		log.Fatal("Erreur d'initialisation:", err)
	}
	log.Fatal(support.StartServer(handler))
}
