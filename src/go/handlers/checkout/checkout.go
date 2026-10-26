package checkout

import (
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"
	"strconv"

	"groupie/src/go/db"
	"groupie/src/go/paypal"
	"groupie/src/go/session"
	"groupie/src/go/templates"
)

type CheckoutHandler struct {
	Templates map[string]*template.Template
}

func NewCheckoutHandler(tmpls map[string]*template.Template) *CheckoutHandler {
	return &CheckoutHandler{Templates: tmpls}
}

func (h *CheckoutHandler) Handle(w http.ResponseWriter, r *http.Request) {
	user, err := session.GetUserFromRequest(r)
	if err != nil {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	rows, err := db.DB.Query(
		"SELECT id, concert_data, seat_type, quantity, price FROM cart WHERE user_id = ? ORDER BY created_at DESC",
		user.ID,
	)
	if err != nil {
		http.Error(w, "Error fetching cart", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type CartItem struct {
		ID          int
		ConcertData string
		SeatType    string
		Quantity    int
		Price       float64
	}

	var items []CartItem
	var total float64
	for rows.Next() {
		var item CartItem
		err := rows.Scan(&item.ID, &item.ConcertData, &item.SeatType, &item.Quantity, &item.Price)
		if err != nil {
			continue
		}
		items = append(items, item)
		total += item.Price * float64(item.Quantity)
	}

	if len(items) == 0 {
		http.Redirect(w, r, "/home", http.StatusSeeOther)
		return
	}

	success := r.URL.Query().Get("success") == "true"
	errorMsg := r.URL.Query().Get("error")
	cancelled := r.URL.Query().Get("cancelled") == "true"

	if cancelled {
		errorMsg = "Paiement annulé"
	}

	data := map[string]interface{}{
		"User":    user,
		"Items":   items,
		"Total":   total,
		"Success": success,
		"Error":   errorMsg,
	}

	templates.RenderTemplate(w, h.Templates, "checkout.html", data)
}

func (h *CheckoutHandler) HandleCreatePayment(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, err := session.GetUserID(r)
	if err != nil {
		http.Error(w, "Non authentifié", http.StatusUnauthorized)
		return
	}

	rows, err := db.DB.Query(
		"SELECT id, concert_data, seat_type, quantity, price FROM cart WHERE user_id = ?",
		userID,
	)
	if err != nil {
		http.Error(w, "Error fetching cart", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var total float64
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

		items = append(items, map[string]interface{}{
			"id":          id,
			"concertData": concertData,
			"seatType":    seatType,
			"quantity":    quantity,
			"price":       price,
		})

		total += price * float64(quantity)
	}

	if total <= 0 {
		http.Error(w, "Le panier est vide", http.StatusBadRequest)
		return
	}

	result, err := db.DB.Exec(
		"INSERT INTO orders (user_id, total_amount, payment_method, payment_status) VALUES (?, ?, ?, ?)",
		userID, total, "paypal", "pending",
	)
	if err != nil {
		http.Error(w, "Error creating order", http.StatusInternalServerError)
		return
	}

	orderID, _ := result.LastInsertId()

	for _, item := range items {
		concertDataJSON, _ := json.Marshal(item["concertData"])
		db.DB.Exec(
			"INSERT INTO order_items (order_id, concert_data, seat_type, quantity, price) VALUES (?, ?, ?, ?, ?)",
			orderID, string(concertDataJSON), item["seatType"], item["quantity"], item["price"],
		)
	}

	paypalClient := paypal.NewClient()

	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	}
	host := r.Host
	returnURL := fmt.Sprintf("%s://%s/api/payment/return?order_id=%d", scheme, host, orderID)
	cancelURL := fmt.Sprintf("%s://%s/checkout?cancelled=true", scheme, host)

	paypalOrder, err := paypalClient.CreateOrder(total, returnURL, cancelURL)
	if err != nil {
		db.DB.Exec("UPDATE orders SET payment_status = ? WHERE id = ?", "failed", orderID)
		http.Error(w, fmt.Sprintf("Erreur lors de la création de la commande PayPal: %v", err), http.StatusInternalServerError)
		return
	}

	_, err = db.DB.Exec(
		"UPDATE orders SET paypal_order_id = ? WHERE id = ?",
		paypalOrder.ID, orderID,
	)
	if err != nil {
		fmt.Printf("Erreur lors de la sauvegarde de l'ID PayPal: %v\n", err)
	}

	approvalURL := paypalOrder.GetApprovalURL()
	if approvalURL == "" {
		http.Error(w, "Impossible de récupérer l'URL d'approbation PayPal", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":       true,
		"orderId":       orderID,
		"paypalOrderId": paypalOrder.ID,
		"approvalUrl":   approvalURL,
	})
}

func (h *CheckoutHandler) HandleCapturePayment(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, err := session.GetUserID(r)
	if err != nil {
		http.Error(w, "Non authentifié", http.StatusUnauthorized)
		return
	}

	var req struct {
		PayPalOrderID string `json:"paypalOrderId"`
		OrderID       string `json:"orderId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	paypalClient := paypal.NewClient()
	capture, err := paypalClient.CaptureOrder(req.PayPalOrderID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Erreur lors de la capture du paiement: %v", err), http.StatusInternalServerError)
		return
	}

	if capture.Status != "COMPLETED" {
		http.Error(w, fmt.Sprintf("Le paiement n'a pas été complété. Statut: %s", capture.Status), http.StatusBadRequest)
		return
	}

	orderIDInt, _ := strconv.ParseInt(req.OrderID, 10, 64)
	_, err = db.DB.Exec(
		"UPDATE orders SET payment_status = ?, paypal_capture_id = ? WHERE id = ? AND user_id = ?",
		"completed", capture.ID, orderIDInt, userID,
	)
	if err != nil {
		http.Error(w, "Error updating order", http.StatusInternalServerError)
		return
	}

	db.DB.Exec("DELETE FROM cart WHERE user_id = ?", userID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":   true,
		"message":   "Paiement effectué avec succès",
		"captureId": capture.ID,
	})
}

func (h *CheckoutHandler) HandlePaymentReturn(w http.ResponseWriter, r *http.Request) {
	userID, err := session.GetUserID(r)
	if err != nil {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	paypalOrderID := r.URL.Query().Get("token")
	orderIDStr := r.URL.Query().Get("order_id")

	if paypalOrderID == "" {
		http.Redirect(w, r, "/checkout?error=missing_paypal_token", http.StatusSeeOther)
		return
	}

	var dbOrderID int
	if orderIDStr != "" {
		orderIDInt, err := strconv.ParseInt(orderIDStr, 10, 64)
		if err == nil {
			err = db.DB.QueryRow(
				"SELECT id FROM orders WHERE id = ? AND user_id = ? AND paypal_order_id = ?",
				orderIDInt, userID, paypalOrderID,
			).Scan(&dbOrderID)

			if err != nil {
				http.Redirect(w, r, "/checkout?error=order_not_found", http.StatusSeeOther)
				return
			}
		}
	} else {
		err = db.DB.QueryRow(
			"SELECT id FROM orders WHERE paypal_order_id = ? AND user_id = ?",
			paypalOrderID, userID,
		).Scan(&dbOrderID)

		if err != nil {
			http.Redirect(w, r, "/checkout?error=order_not_found", http.StatusSeeOther)
			return
		}
	}

	paypalClient := paypal.NewClient()
	capture, err := paypalClient.CaptureOrder(paypalOrderID)
	if err != nil {
		http.Redirect(w, r, fmt.Sprintf("/checkout?error=capture_failed&message=%s", err.Error()), http.StatusSeeOther)
		return
	}

	if capture.Status == "COMPLETED" {
		_, err = db.DB.Exec(
			"UPDATE orders SET payment_status = ?, paypal_capture_id = ? WHERE id = ?",
			"completed", capture.ID, dbOrderID,
		)
		if err == nil {
			db.DB.Exec("DELETE FROM cart WHERE user_id = ?", userID)
			http.Redirect(w, r, "/checkout?success=true", http.StatusSeeOther)
			return
		}
	}

	http.Redirect(w, r, "/checkout?error=payment_failed", http.StatusSeeOther)
}

// HandleDemoPayment - Paiement de démonstration (simule un paiement réussi)
func (h *CheckoutHandler) HandleDemoPayment(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, err := session.GetUserID(r)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Non authentifié",
		})
		return
	}

	rows, err := db.DB.Query(
		"SELECT id, concert_data, seat_type, quantity, price FROM cart WHERE user_id = ?",
		userID,
	)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Erreur lors de la récupération du panier",
		})
		return
	}
	defer rows.Close()

	var total float64
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
		json.Unmarshal([]byte(concertDataJSON), &concertData)

		items = append(items, map[string]interface{}{
			"id":          id,
			"concertData": concertData,
			"seatType":    seatType,
			"quantity":    quantity,
			"price":       price,
		})

		total += price * float64(quantity)
	}

	if total <= 0 {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Le panier est vide",
		})
		return
	}

	// Créer la commande
	result, err := db.DB.Exec(
		"INSERT INTO orders (user_id, total_amount, payment_method, payment_status) VALUES (?, ?, ?, ?)",
		userID, total, "card", "completed",
	)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   "Erreur lors de la création de la commande",
		})
		return
	}

	orderID, _ := result.LastInsertId()

	// Ajouter les articles à la commande
	for _, item := range items {
		concertDataJSON, _ := json.Marshal(item["concertData"])
		db.DB.Exec(
			"INSERT INTO order_items (order_id, concert_data, seat_type, quantity, price) VALUES (?, ?, ?, ?, ?)",
			orderID, string(concertDataJSON), item["seatType"], item["quantity"], item["price"],
		)
	}

	// Vider le panier
	db.DB.Exec("DELETE FROM cart WHERE user_id = ?", userID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Paiement effectué avec succès",
		"orderId": orderID,
	})
}
