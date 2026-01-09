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
	usersQuery := `
	CREATE TABLE IF NOT EXISTS users (
		id INT AUTO_INCREMENT PRIMARY KEY,
		email VARCHAR(255) NOT NULL UNIQUE,
		password VARCHAR(255) NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`

	_, err := DB.Exec(usersQuery)
	if err != nil {
		return fmt.Errorf("erreur lors de la création de la table users: %w", err)
	}

	favoritesQuery := `
	CREATE TABLE IF NOT EXISTS favorites (
		user_id INT,
		artist_id INT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY (user_id, artist_id),
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	);`

	_, err = DB.Exec(favoritesQuery)
	if err != nil {
		return fmt.Errorf("erreur lors de la création de la table favorites: %w", err)
	}

	sessionsQuery := `
	CREATE TABLE IF NOT EXISTS sessions (
		token VARCHAR(255) PRIMARY KEY,
		user_id INT NOT NULL,
		expires_at TIMESTAMP NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	);`

	_, err = DB.Exec(sessionsQuery)
	if err != nil {
		return fmt.Errorf("erreur lors de la création de la table sessions: %w", err)
	}

	return migrateTables()
}

func migrateTables() error {
	// Add columns to users table if they don't exist
	// We ignore errors here as it's a simple way to handle "duplicate column" for this project scale
	alterQueries := []string{
		"ALTER TABLE users ADD COLUMN first_name VARCHAR(255) DEFAULT ''",
		"ALTER TABLE users ADD COLUMN last_name VARCHAR(255) DEFAULT ''",
		"ALTER TABLE users ADD COLUMN avatar VARCHAR(255) DEFAULT ''",
	}

	for _, query := range alterQueries {
		DB.Exec(query) // Ignore error
	}

	return nil
}
