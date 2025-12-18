package routes

import (
	"database/sql"
	"html/template"
	"net/http"

	"groupie/src/models"
	"groupie/src/support/db"
	"groupie/src/support/templates"

	"golang.org/x/crypto/bcrypt"
)

// AuthHandler gère l'authentification
type AuthHandler struct {
	Templates map[string]*template.Template
}

// NewAuthHandler crée un nouveau gestionnaire d'authentification
func NewAuthHandler(tmpls map[string]*template.Template) *AuthHandler {
	return &AuthHandler{
		Templates: tmpls,
	}
}

// HandleLogin gère la page de connexion
func (h *AuthHandler) HandleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		templates.RenderTemplate(w, h.Templates, "login.html", nil)
		return
	}

	if r.Method == "POST" {
		email := r.FormValue("email")
		password := r.FormValue("password")

		var user models.User
		err := db.DB.QueryRow("SELECT id, email, password FROM users WHERE email = ?", email).Scan(&user.ID, &user.Email, &user.Password)

		if err == sql.ErrNoRows {
			data := map[string]string{"Error": "Email ou mot de passe incorrect"}
			templates.RenderTemplate(w, h.Templates, "login.html", data)
			return
		} else if err != nil {
			http.Error(w, "Erreur serveur", http.StatusInternalServerError)
			return
		}

		err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password))
		if err != nil {
			data := map[string]string{"Error": "Email ou mot de passe incorrect"}
			templates.RenderTemplate(w, h.Templates, "login.html", data)
			return
		}

		// Connexion réussie -> Redirection vers /home
		http.Redirect(w, r, "/home", http.StatusSeeOther)
	}
}

// HandleRegister gère la page d'inscription
func (h *AuthHandler) HandleRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		templates.RenderTemplate(w, h.Templates, "register.html", nil)
		return
	}

	if r.Method == "POST" {
		email := r.FormValue("email")
		password := r.FormValue("password")
		confirmPassword := r.FormValue("confirm_password")

		if password != confirmPassword {
			data := map[string]string{"Error": "Les mots de passe ne correspondent pas"}
			templates.RenderTemplate(w, h.Templates, "register.html", data)
			return
		}

		if len(password) < 6 {
			data := map[string]string{"Error": "Le mot de passe doit contenir au moins 6 caractères"}
			templates.RenderTemplate(w, h.Templates, "register.html", data)
			return
		}

		// Vérifier si l'email existe déjà
		var exists bool
		err := db.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE email = ?)", email).Scan(&exists)
		if err != nil {
			http.Error(w, "Erreur serveur", http.StatusInternalServerError)
			return
		}

		if exists {
			data := map[string]string{"Error": "Cet email est déjà utilisé"}
			templates.RenderTemplate(w, h.Templates, "register.html", data)
			return
		}

		// Hash du mot de passe
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			http.Error(w, "Erreur serveur", http.StatusInternalServerError)
			return
		}

		// Insertion en base
		_, err = db.DB.Exec("INSERT INTO users (email, password) VALUES (?, ?)", email, string(hashedPassword))
		if err != nil {
			http.Error(w, "Erreur lors de l'inscription", http.StatusInternalServerError)
			return
		}

		// Inscription réussie -> Redirection vers login
		http.Redirect(w, r, "/login?registered=true", http.StatusSeeOther)
	}
}
