package routes

import (
	"encoding/json"
	"html/template"
	"net/http"

	"groupie/src/support/db"
	"groupie/src/support/session"
	"groupie/src/support/templates"
	"groupie/src/support/utils"

	"golang.org/x/crypto/bcrypt"
)

type UserHandler struct {
	Templates map[string]*template.Template
}

func NewUserHandler(tmpls map[string]*template.Template) *UserHandler {
	return &UserHandler{
		Templates: tmpls,
	}
}

// HandleLogout déconnecte l'utilisateur
func (h *UserHandler) HandleLogout(w http.ResponseWriter, r *http.Request) {
	session.ClearSession(w, r)
	http.Redirect(w, r, "/", http.StatusSeeOther)
}

// HandleToggleFavorite ajoute ou supprime un favori
func (h *UserHandler) HandleToggleFavorite(w http.ResponseWriter, r *http.Request) {
	user, err := session.GetUserFromRequest(r)
	if err != nil {
		utils.RespondError(w, http.StatusUnauthorized, "Non connecté")
		return
	}

	var req struct {
		ArtistID int    `json:"artistId"`
		Action   string `json:"action"` // "add" or "remove"
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "Requête invalide")
		return
	}

	var execErr error
	if req.Action == "add" {
		_, execErr = db.DB.Exec("INSERT IGNORE INTO favorites (user_id, artist_id) VALUES (?, ?)", user.ID, req.ArtistID)
	} else if req.Action == "remove" {
		_, execErr = db.DB.Exec("DELETE FROM favorites WHERE user_id = ? AND artist_id = ?", user.ID, req.ArtistID)
	} else {
		utils.RespondError(w, http.StatusBadRequest, "Action inconnue")
		return
	}

	if execErr != nil {
		utils.RespondError(w, http.StatusInternalServerError, "Erreur base de données")
		return
	}

	utils.RespondJSON(w, map[string]string{"status": "ok"})
}

// HandleProfile gère l'affichage et la mise à jour du profil
func (h *UserHandler) HandleProfile(w http.ResponseWriter, r *http.Request) {
	user, err := session.GetUserFromRequest(r)
	if err != nil {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	if r.Method == "GET" {
		data := map[string]interface{}{
			"User": user,
		}

		// Récupérer les favoris pour affichage
		rows, err := db.DB.Query("SELECT artist_id FROM favorites WHERE user_id = ?", user.ID)
		if err == nil {
			var favs []int
			for rows.Next() {
				var fid int
				rows.Scan(&fid)
				favs = append(favs, fid)
			}
			rows.Close()
			data["FavoritesCount"] = len(favs)
		}

		templates.RenderTemplate(w, h.Templates, "profile.html", data)
		return
	}

	if r.Method == "POST" {
		email := r.FormValue("email")
		password := r.FormValue("password")

		// Update email if changed
		if email != "" && email != user.Email {
			_, err := db.DB.Exec("UPDATE users SET email = ? WHERE id = ?", email, user.ID)
			if err != nil {
				data := map[string]interface{}{"User": user, "Error": "Email déjà utilisé ou erreur"}
				templates.RenderTemplate(w, h.Templates, "profile.html", data)
				return
			}
			user.Email = email
		}

		// Update password if provided
		if password != "" {
			if len(password) < 6 {
				data := map[string]interface{}{"User": user, "Error": "Mot de passe trop court"}
				templates.RenderTemplate(w, h.Templates, "profile.html", data)
				return
			}
			hashed, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
			_, err := db.DB.Exec("UPDATE users SET password = ? WHERE id = ?", string(hashed), user.ID)
			if err != nil {
				data := map[string]interface{}{"User": user, "Error": "Erreur mise à jour mot de passe"}
				templates.RenderTemplate(w, h.Templates, "profile.html", data)
				return
			}
		}

		data := map[string]interface{}{"User": user, "Success": "Profil mis à jour"}
		templates.RenderTemplate(w, h.Templates, "profile.html", data)
	}
}
