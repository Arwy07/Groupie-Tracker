package db

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

// DB est l'instance de la base de données
var DB *sql.DB

// InitDB initialise la connexion à la base de données
func InitDB() error {
	// Configuration par défaut pour phpMyAdmin local (XAMPP/WAMP)
	// User: root, Password: (vide), Host: localhost:3306, DB: groupie_tracker
	dsn := "root:@tcp(127.0.0.1:3306)/groupie_tracker?parseTime=true"

	var err error
	DB, err = sql.Open("mysql", dsn)
	if err != nil {
		return fmt.Errorf("erreur d'ouverture de la connexion DB: %w", err)
	}

	// Configuration du pool de connexions
	DB.SetMaxOpenConns(25)
	DB.SetMaxIdleConns(25)
	DB.SetConnMaxLifetime(5 * time.Minute)

	// Vérification de la connexion
	if err := DB.Ping(); err != nil {
		// Si la base n'existe pas, on essaie de se connecter sans DB pour la créer
		log.Println("La base de données n'est pas accessible, tentative de création...")
		return createDatabase()
	}

	log.Println("Connexion à la base de données établie avec succès")
	return createTables()
}

func createDatabase() error {
	dsn := "root:@tcp(127.0.0.1:3306)/"
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return err
	}
	defer db.Close()

	_, err = db.Exec("CREATE DATABASE IF NOT EXISTS groupie_tracker")
	if err != nil {
		return fmt.Errorf("impossible de créer la base de données: %w", err)
	}

	// Reconnexion à la nouvelle base
	return InitDB()
}

func createTables() error {
	query := `
	CREATE TABLE IF NOT EXISTS users (
		id INT AUTO_INCREMENT PRIMARY KEY,
		email VARCHAR(255) NOT NULL UNIQUE,
		password VARCHAR(255) NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`

	_, err := DB.Exec(query)
	if err != nil {
		return fmt.Errorf("erreur lors de la création des tables: %w", err)
	}
	return nil
}
