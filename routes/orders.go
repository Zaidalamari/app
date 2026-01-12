package routes

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/Zaidalamari/app/config"
	"github.com/Zaidalamari/app/middleware"
	"github.com/Zaidalamari/app/utils"
	"github.com/gorilla/mux"
)

// RegisterOrderRoutes registers order routes
func RegisterOrderRoutes(router *mux.Router) {
	router.Handle("/api/orders", middleware.AuthenticateToken(http.HandlerFunc(getOrdersHandler))).Methods("GET")
	router.Handle("/api/orders", middleware.AuthenticateToken(http.HandlerFunc(createOrderHandler))).Methods("POST")
}

func getOrdersHandler(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		utils.RespondError(w, http.StatusUnauthorized, "غير مصرح")
		return
	}

	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")

	page := 1
	limit := 20

	if pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	offset := (page - 1) * limit

	rows, err := config.DB.Query(`
		SELECT o.id, o.user_id, o.product_id, o.quantity, o.total_price, o.status, o.created_at,
		       p.name, p.name_ar
		FROM orders o
		JOIN products p ON o.product_id = p.id
		WHERE o.user_id = $1
		ORDER BY o.created_at DESC
		LIMIT $2 OFFSET $3
	`, user.ID, limit, offset)

	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "خطأ في الخادم")
		return
	}
	defer rows.Close()

	var orders []map[string]interface{}
	for rows.Next() {
		var id, userID, productID, status, productName, productNameAr string
		var quantity int
		var totalPrice float64
		var createdAt sql.NullTime

		if err := rows.Scan(&id, &userID, &productID, &quantity, &totalPrice, &status, &createdAt, 
			&productName, &productNameAr); err != nil {
			continue
		}

		orders = append(orders, map[string]interface{}{
			"id":              id,
			"user_id":         userID,
			"product_id":      productID,
			"quantity":        quantity,
			"total_price":     totalPrice,
			"status":          status,
			"created_at":      createdAt.Time,
			"product_name":    productName,
			"product_name_ar": productNameAr,
		})
	}

	utils.RespondSuccess(w, orders)
}

func createOrderHandler(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		utils.RespondError(w, http.StatusUnauthorized, "غير مصرح")
		return
	}

	var req struct {
		ProductID string `json:"product_id"`
		Quantity  int    `json:"quantity"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "بيانات غير صالحة")
		return
	}

	if req.ProductID == "" || req.Quantity <= 0 {
		utils.RespondError(w, http.StatusBadRequest, "بيانات غير صالحة")
		return
	}

	// Begin transaction
	tx, err := config.DB.Begin()
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "خطأ في الخادم")
		return
	}
	defer tx.Rollback()

	// Get product
	var productName, productNameAr string
	var price, distributorPrice sql.NullFloat64
	var isActive bool
	err = tx.QueryRow(`
		SELECT name, name_ar, selling_price, distributor_price, is_active
		FROM products WHERE id = $1
	`, req.ProductID).Scan(&productName, &productNameAr, &price, &distributorPrice, &isActive)

	if err == sql.ErrNoRows {
		utils.RespondError(w, http.StatusNotFound, "المنتج غير موجود")
		return
	}

	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "خطأ في الخادم")
		return
	}

	if !isActive {
		utils.RespondError(w, http.StatusBadRequest, "المنتج غير متاح")
		return
	}

	// Determine price based on user role
	finalPrice := price.Float64
	if user.Role == "distributor" && distributorPrice.Valid {
		finalPrice = distributorPrice.Float64
	}

	totalPrice := finalPrice * float64(req.Quantity)

	// Get and lock wallet
	var walletID string
	var balance float64
	err = tx.QueryRow(`
		SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE
	`, user.ID).Scan(&walletID, &balance)

	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "خطأ في الخادم")
		return
	}

	if balance < totalPrice {
		utils.RespondError(w, http.StatusBadRequest, "رصيد غير كافٍ")
		return
	}

	// Check available codes
	var availableCount int
	err = tx.QueryRow(`
		SELECT COUNT(*) FROM card_codes 
		WHERE product_id = $1 AND is_sold = false
	`, req.ProductID).Scan(&availableCount)

	if err != nil || availableCount < req.Quantity {
		utils.RespondError(w, http.StatusBadRequest, "الكمية المطلوبة غير متوفرة")
		return
	}

	// Create order
	var orderID string
	err = tx.QueryRow(`
		INSERT INTO orders (user_id, product_id, quantity, total_price, status)
		VALUES ($1, $2, $3, $4, 'completed')
		RETURNING id
	`, user.ID, req.ProductID, req.Quantity, totalPrice).Scan(&orderID)

	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "خطأ في الخادم")
		return
	}

	// Mark codes as sold
	_, err = tx.Exec(`
		UPDATE card_codes SET is_sold = true, sold_at = CURRENT_TIMESTAMP, 
		       sold_to = $1, order_id = $2
		WHERE id IN (
			SELECT id FROM card_codes 
			WHERE product_id = $3 AND is_sold = false 
			LIMIT $4
		)
	`, user.ID, orderID, req.ProductID, req.Quantity)

	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "خطأ في الخادم")
		return
	}

	// Update wallet balance
	newBalance := balance - totalPrice
	_, err = tx.Exec(`
		UPDATE wallets SET balance = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`, newBalance, walletID)

	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "خطأ في الخادم")
		return
	}

	// Create transaction record
	_, err = tx.Exec(`
		INSERT INTO transactions (wallet_id, user_id, type, amount, balance_before, balance_after, description, reference_id)
		VALUES ($1, $2, 'purchase', $3, $4, $5, $6, $7)
	`, walletID, user.ID, totalPrice, balance, newBalance, 
		"شراء "+strconv.Itoa(req.Quantity)+" من "+productName, orderID)

	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "خطأ في الخادم")
		return
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "خطأ في الخادم")
		return
	}

	// Get purchased codes
	rows, err := config.DB.Query(`
		SELECT code, serial FROM card_codes WHERE order_id = $1
	`, orderID)

	if err != nil {
		utils.RespondSuccess(w, map[string]interface{}{
			"message": "تمت العملية بنجاح",
			"order": map[string]interface{}{
				"id":          orderID,
				"total_price": totalPrice,
			},
		})
		return
	}
	defer rows.Close()

	var codes []map[string]interface{}
	for rows.Next() {
		var code, serial sql.NullString
		if err := rows.Scan(&code, &serial); err == nil {
			codes = append(codes, map[string]interface{}{
				"code":   code.String,
				"serial": serial.String,
			})
		}
	}

	utils.RespondSuccess(w, map[string]interface{}{
		"message": "تمت العملية بنجاح",
		"order": map[string]interface{}{
			"id":          orderID,
			"total_price": totalPrice,
		},
		"codes": codes,
	})
}
