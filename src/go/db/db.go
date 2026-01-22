package db

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

var DB *sql.DB

func InitDB() error {
	dsn := "root:@tcp(127.0.0.1:3306)/groupie_tracker?parseTime=true"

	var err error
	DB, err = sql.Open("mysql", dsn)
	if err != nil {
		return fmt.Errorf("erreur d'ouverture de la connexion DB: %w", err)
	}

	DB.SetMaxOpenConns(25)
	DB.SetMaxIdleConns(25)
	DB.SetConnMaxLifetime(5 * time.Minute)

	if err := DB.Ping(); err != nil {
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
	// Exécuter les migrations de colonnes en parallèle via une transaction batch
	alterQueries := []string{
		"ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(255) DEFAULT ''",
		"ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(255) DEFAULT ''",
		"ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar VARCHAR(255) DEFAULT ''",
		"ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE",
		"ALTER TABLE users ADD COLUMN IF NOT EXISTS is_owner BOOLEAN DEFAULT FALSE",
	}

	for _, query := range alterQueries {
		// Ignorer les erreurs car la colonne peut déjà exister
		_, _ = DB.Exec(query)
	}

	cartQuery := `
	CREATE TABLE IF NOT EXISTS cart (
		id INT AUTO_INCREMENT PRIMARY KEY,
		user_id INT NOT NULL,
		concert_data TEXT NOT NULL,
		seat_type VARCHAR(50) NOT NULL,
		quantity INT NOT NULL DEFAULT 1,
		price DECIMAL(10, 2) NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
		INDEX idx_user_id (user_id)
	);`
	DB.Exec(cartQuery)

	// Migration: convertir JSON en TEXT si nécessaire
	DB.Exec("ALTER TABLE cart MODIFY COLUMN concert_data TEXT NOT NULL")
	DB.Exec("ALTER TABLE order_items MODIFY COLUMN concert_data TEXT NOT NULL")

	ordersQuery := `
	CREATE TABLE IF NOT EXISTS orders (
		id INT AUTO_INCREMENT PRIMARY KEY,
		user_id INT NOT NULL,
		total_amount DECIMAL(10, 2) NOT NULL,
		payment_method VARCHAR(50) NOT NULL,
		payment_status VARCHAR(50) DEFAULT 'pending',
		paypal_order_id VARCHAR(255),
		paypal_capture_id VARCHAR(255),
		stripe_payment_intent_id VARCHAR(255),
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
		INDEX idx_user_id (user_id),
		INDEX idx_payment_status (payment_status)
	);`
	DB.Exec(ordersQuery)

	DB.Exec("ALTER TABLE orders ADD COLUMN paypal_capture_id VARCHAR(255)")
	DB.Exec("ALTER TABLE orders ADD COLUMN stripe_payment_intent_id VARCHAR(255)")

	orderItemsQuery := `
	CREATE TABLE IF NOT EXISTS order_items (
		id INT AUTO_INCREMENT PRIMARY KEY,
		order_id INT NOT NULL,
		concert_data TEXT NOT NULL,
		seat_type VARCHAR(50) NOT NULL,
		quantity INT NOT NULL,
		price DECIMAL(10, 2) NOT NULL,
		FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
		INDEX idx_order_id (order_id)
	);`
	DB.Exec(orderItemsQuery)

	termsQuery := `
	CREATE TABLE IF NOT EXISTS terms_acceptance (
		id INT AUTO_INCREMENT PRIMARY KEY,
		user_id INT NOT NULL,
		accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		ip_address VARCHAR(45),
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
		UNIQUE KEY unique_user_acceptance (user_id)
	);`
	DB.Exec(termsQuery)

	return nil
}
