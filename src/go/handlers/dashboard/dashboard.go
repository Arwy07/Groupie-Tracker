package dashboard

import (
	"database/sql"
	"html/template"
	"net/http"

	"groupie/src/go/db"
	"groupie/src/go/session"
	"groupie/src/go/templates"
)

type DashboardHandler struct {
	Templates map[string]*template.Template
}

func NewDashboardHandler(tmpls map[string]*template.Template) *DashboardHandler {
	return &DashboardHandler{Templates: tmpls}
}

func (h *DashboardHandler) Handle(w http.ResponseWriter, r *http.Request) {
	user, err := session.GetUserFromRequest(r)
	if err != nil {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	if !user.IsAdmin && !user.IsOwner {
		http.Error(w, "Accès refusé", http.StatusForbidden)
		return
	}

	rows, err := db.DB.Query(`
		SELECT id, email, first_name, last_name, avatar, is_admin, is_owner, created_at 
		FROM users 
		ORDER BY created_at DESC
	`)
	if err != nil {
		http.Error(w, "Error fetching users", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type UserData struct {
		ID        int
		Email     string
		FirstName string
		LastName  string
		Avatar    string
		IsAdmin   bool
		IsOwner   bool
		CreatedAt string
	}

	var users []UserData
	for rows.Next() {
		var u UserData
		var createdAt sql.NullTime
		err := rows.Scan(&u.ID, &u.Email, &u.FirstName, &u.LastName, &u.Avatar, &u.IsAdmin, &u.IsOwner, &createdAt)
		if err != nil {
			continue
		}
		if createdAt.Valid {
			u.CreatedAt = createdAt.Time.Format("2006-01-02 15:04:05")
		}
		users = append(users, u)
	}

	data := map[string]interface{}{
		"User":    user,
		"Users":   users,
		"IsOwner": user.IsOwner,
	}

	templates.RenderTemplate(w, h.Templates, "dashboard.html", data)
}

