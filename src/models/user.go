package models

import "time"

// User représente un utilisateur dans la base de données
type User struct {
	ID        int       `json:"id"`
	Email     string    `json:"email"`
	Password  string    `json:"-"` // Le mot de passe ne doit jamais être renvoyé en JSON
	CreatedAt time.Time `json:"created_at"`
}

// LoginCredentials contient les informations de connexion
type LoginCredentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// RegisterCredentials contient les informations d'inscription
type RegisterCredentials struct {
	Email           string `json:"email"`
	Password        string `json:"password"`
	ConfirmPassword string `json:"confirm_password"`
}
