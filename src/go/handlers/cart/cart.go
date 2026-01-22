package cart

import (
	"encoding/json"
	"log"
	"net/http"

	"groupie/src/go/db"
	"groupie/src/go/session"
)

type CartHandler struct{}

func NewCartHandler() *CartHandler {
	return &CartHandler{}
}

func (h *CartHandler) HandleAddItem(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": "Method not allowed"})
		return
	}

	userID, err := session.GetUserID(r)
	if err != nil {
		log.Printf("Cart: erreur d'authentification: %v", err)
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": "Non authentifié"})
		return
	}

	var cartItem struct {
		ConcertData map[string]interface{} `json:"concertData"`
		SeatType    string                 `json:"seatType"`
		SeatName    string                 `json:"seatName"`
		Quantity    int                    `json:"quantity"`
		Price       float64                `json:"price"`
		Total       float64                `json:"total"`
	}

	if err := json.NewDecoder(r.Body).Decode(&cartItem); err != nil {
		log.Printf("Cart: erreur de décodage JSON: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": "Requête invalide"})
		return
	}

	concertDataJSON, err := json.Marshal(cartItem.ConcertData)
	if err != nil {
		log.Printf("Cart: erreur d'encodage concert_data: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": "Erreur d'encodage"})
		return
	}

	_, err = db.DB.Exec(
		"INSERT INTO cart (user_id, concert_data, seat_type, quantity, price) VALUES (?, ?, ?, ?, ?)",
		userID, string(concertDataJSON), cartItem.SeatType, cartItem.Quantity, cartItem.Price,
	)
	if err != nil {
		log.Printf("Cart: erreur SQL lors de l'insertion: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": false, "error": "Erreur lors de l'ajout au panier"})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

func (h *CartHandler) HandleGetCart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, err := session.GetUserID(r)
	if err != nil {
		http.Error(w, "Non authentifié", http.StatusUnauthorized)
		return
	}

	rows, err := db.DB.Query(
		"SELECT id, concert_data, seat_type, quantity, price FROM cart WHERE user_id = ? ORDER BY created_at DESC",
		userID,
	)
	if err != nil {
		http.Error(w, "Error fetching cart", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var items []map[string]interface{}
	for rows.Next() {
		var id, quantity int
		var seatType string
		var price float64
		var concertDataJSON string

		if err := rows.Scan(&id, &concertDataJSON, &seatType, &quantity, &price); err != nil {
			continue
		}

		var concertData map[string]interface{}
		if err := json.Unmarshal([]byte(concertDataJSON), &concertData); err != nil {
			continue
		}

		seatName := getSeatName(seatType)

		items = append(items, map[string]interface{}{
			"id":          id,
			"concertData": concertData,
			"seatType":    seatType,
			"seatName":    seatName,
			"quantity":    quantity,
			"price":       price,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"items": items})
}

func (h *CartHandler) HandleGetCartCount(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, err := session.GetUserID(r)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"count": 0})
		return
	}

	var count int
	err = db.DB.QueryRow("SELECT COUNT(*) FROM cart WHERE user_id = ?", userID).Scan(&count)
	if err != nil {
		count = 0
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"count": count})
}

func (h *CartHandler) HandleRemoveItem(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, err := session.GetUserID(r)
	if err != nil {
		http.Error(w, "Non authentifié", http.StatusUnauthorized)
		return
	}

	path := r.URL.Path
	itemID := path[len("/api/cart/remove/"):]
	if itemID == "" {
		http.Error(w, "Item ID required", http.StatusBadRequest)
		return
	}

	var ownerID int
	err = db.DB.QueryRow("SELECT user_id FROM cart WHERE id = ?", itemID).Scan(&ownerID)
	if err != nil {
		http.Error(w, "Item not found", http.StatusNotFound)
		return
	}

	if ownerID != userID {
		http.Error(w, "Unauthorized", http.StatusForbidden)
		return
	}

	_, err = db.DB.Exec("DELETE FROM cart WHERE id = ?", itemID)
	if err != nil {
		http.Error(w, "Error removing item", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

func (h *CartHandler) HandleClearCart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, err := session.GetUserID(r)
	if err != nil {
		http.Error(w, "Non authentifié", http.StatusUnauthorized)
		return
	}

	_, err = db.DB.Exec("DELETE FROM cart WHERE user_id = ?", userID)
	if err != nil {
		http.Error(w, "Error clearing cart", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
}

func getSeatName(seatType string) string {
	seatNames := map[string]string{
		"fosse":   "Fosse",
		"gradin":  "Gradin",
		"vip":     "VIP",
		"premium": "Premium",
	}
	if name, ok := seatNames[seatType]; ok {
		return name
	}
	return seatType
}
