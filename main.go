package main

import (
	"groupie/src/go/routes"
	"groupie/src/go/server"
	"log"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("Fichier .env non trouvé, utilisation des variables d'environnement système")
	}

	handler, err := routes.SetupRoutes()
	if err != nil {
		log.Fatal("Erreur d'initialisation:", err)
	}
	log.Fatal(server.StartServer(handler))
}
