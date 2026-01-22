package session

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"net/http"
	"time"

	"groupie/src/go/db"
	"groupie/src/go/models"
)

func GenerateToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func CreateSession(w http.ResponseWriter, userID int) error {
	token, err := GenerateToken()
	if err != nil {
		return err
	}

	expiresAt := time.Now().Add(24 * time.Hour)

	_, err = db.DB.Exec("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)", token, userID, expiresAt)
	if err != nil {
		return err
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    token,
		Expires:  expiresAt,
		HttpOnly: true,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
	})

	return nil
}

func GetUserFromRequest(r *http.Request) (*models.User, error) {
	c, err := r.Cookie("session_token")
	if err != nil {
		return nil, err
	}
	token := c.Value

	var user models.User
	var expiresAt time.Time

	err = db.DB.QueryRow(`
		SELECT u.id, u.email, u.first_name, u.last_name, u.avatar, u.is_admin, u.is_owner, s.expires_at 
		FROM users u 
		JOIN sessions s ON u.id = s.user_id 
		WHERE s.token = ?`, token).Scan(&user.ID, &user.Email, &user.FirstName, &user.LastName, &user.Avatar, &user.IsAdmin, &user.IsOwner, &expiresAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("limit session invalid")
		}
		return nil, err
	}

	if time.Now().After(expiresAt) {
		db.DB.Exec("DELETE FROM sessions WHERE token = ?", token)
		return nil, errors.New("session expired")
	}

	return &user, nil
}

func GetUserID(r *http.Request) (int, error) {
	user, err := GetUserFromRequest(r)
	if err != nil {
		return 0, err
	}
	return user.ID, nil
}

func ClearSession(w http.ResponseWriter, r *http.Request) {
	c, err := r.Cookie("session_token")
	if err != nil {
		return
	}

	db.DB.Exec("DELETE FROM sessions WHERE token = ?", c.Value)

	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		HttpOnly: true,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
	})
}
