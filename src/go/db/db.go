package db

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/go-sql-driver/mysql"
)

var DB *sql.DB

func InitDB() error {
	cfg, err := databaseConfig()
	if err != nil {
		return err
	}
	dsn := cfg.FormatDSN()

	DB, err = sql.Open("mysql", dsn)
	if err != nil {
		return fmt.Errorf("erreur d'ouverture de la connexion DB: %w", err)
	}

	DB.SetMaxOpenConns(25)
	DB.SetMaxIdleConns(25)
	DB.SetConnMaxLifetime(5 * time.Minute)

	if err := DB.Ping(); err != nil {
		DB.Close()
		return fmt.Errorf("connexion à la base impossible : vérifier DB_DSN et la base existante : %w", err)
	}

	log.Println("Connexion à la base de données établie avec succès")
	return createTables()
}

func databaseConfig() (*mysql.Config, error) {
	dsn := strings.TrimSpace(os.Getenv("DB_DSN"))
	if dsn == "" {
		return nil, fmt.Errorf("DB_DSN est requis : copier .env.example en .env et configurer un compte dédié")
	}
	cfg, err := mysql.ParseDSN(dsn)
	if err != nil {
		return nil, fmt.Errorf("DB_DSN invalide")
	}
	if cfg.DBName == "" {
		return nil, fmt.Errorf("DB_DSN doit préciser le nom de la base")
	}
	cfg.ParseTime = true
	if cfg.Timeout == 0 {
		cfg.Timeout = 5 * time.Second
	}
	return cfg, nil
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
	// Vérifier les colonnes pour supporter MySQL et MariaDB sans ignorer les erreurs SQL.
	columns := []struct{ name, definition string }{
		{"first_name", "VARCHAR(255) DEFAULT ''"},
		{"last_name", "VARCHAR(255) DEFAULT ''"},
		{"avatar", "VARCHAR(255) DEFAULT ''"},
		{"is_admin", "BOOLEAN DEFAULT FALSE"},
		{"is_owner", "BOOLEAN DEFAULT FALSE"},
	}
	for _, column := range columns {
		var count int
		if err := DB.QueryRow("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME=?", column.name).Scan(&count); err != nil {
			return err
		}
		if count == 0 {
			if _, err := DB.Exec("ALTER TABLE users ADD COLUMN " + column.name + " " + column.definition); err != nil {
				return err
			}
		}
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
	if _, err := DB.Exec(cartQuery); err != nil {
		return err
	}

	// Migration: convertir JSON en TEXT si nécessaire
	if _, err := DB.Exec("ALTER TABLE cart MODIFY COLUMN concert_data TEXT NOT NULL"); err != nil {
		return err
	}

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
	if _, err := DB.Exec(ordersQuery); err != nil {
		return err
	}

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
	if _, err := DB.Exec(orderItemsQuery); err != nil {
		return err
	}

	termsQuery := `
	CREATE TABLE IF NOT EXISTS terms_acceptance (
		id INT AUTO_INCREMENT PRIMARY KEY,
		user_id INT NOT NULL,
		accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		ip_address VARCHAR(45),
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
		UNIQUE KEY unique_user_acceptance (user_id)
	);`
	if _, err := DB.Exec(termsQuery); err != nil {
		return err
	}

	return nil
}
