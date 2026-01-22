package auth

import (
	"database/sql"
	"html/template"
	"net/http"

	"groupie/src/go/db"
	"groupie/src/go/session"
	"groupie/src/go/templates"

	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	Templates map[string]*template.Template
}

func NewAuthHandler(tmpls map[string]*template.Template) *AuthHandler {
	return &AuthHandler{Templates: tmpls}
}

func (h *AuthHandler) HandleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		templates.RenderTemplate(w, h.Templates, "login.html", nil)
		return
	}

	if r.Method == "POST" {
		email := r.FormValue("email")
		password := r.FormValue("password")

		var user struct {
			ID       int
			Email    string
			Password string
		}
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

		if err := session.CreateSession(w, user.ID); err != nil {
			http.Error(w, "Erreur lors de la création de session", http.StatusInternalServerError)
			return
		}

		http.Redirect(w, r, "/home", http.StatusSeeOther)
	}
}

func (h *AuthHandler) HandleRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		templates.RenderTemplate(w, h.Templates, "register.html", nil)
		return
	}

	if r.Method == "POST" {
		email := r.FormValue("email")
		password := r.FormValue("password")
		confirmPassword := r.FormValue("confirm_password")
		acceptTerms := r.FormValue("accept_terms")

		if acceptTerms != "on" {
			data := map[string]string{"Error": "Vous devez accepter les conditions d'utilisation"}
			templates.RenderTemplate(w, h.Templates, "register.html", data)
			return
		}

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

		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			http.Error(w, "Erreur serveur", http.StatusInternalServerError)
			return
		}

		result, err := db.DB.Exec("INSERT INTO users (email, password) VALUES (?, ?)", email, string(hashedPassword))
		if err != nil {
			http.Error(w, "Erreur lors de l'inscription", http.StatusInternalServerError)
			return
		}

		userID, _ := result.LastInsertId()

		ipAddress := r.RemoteAddr
		if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
			ipAddress = forwarded
		}
		db.DB.Exec("INSERT INTO terms_acceptance (user_id, ip_address) VALUES (?, ?)", userID, ipAddress)

		http.Redirect(w, r, "/login?registered=true", http.StatusSeeOther)
	}
}

