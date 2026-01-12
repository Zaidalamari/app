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

// RegisterWalletRoutes registers wallet routes
func RegisterWalletRoutes(router *mux.Router) {
	router.Handle("/api/wallet/balance", middleware.AuthenticateToken(http.HandlerFunc(getBalanceHandler))).Methods("GET")
	router.Handle("/api/wallet/transactions", middleware.AuthenticateToken(http.HandlerFunc(getTransactionsHandler))).Methods("GET")
	router.Handle("/api/wallet/add-balance", middleware.AuthenticateToken(middleware.IsAdmin(http.HandlerFunc(addBalanceHandler)))).Methods("POST")
}

func getBalanceHandler(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		utils.RespondError(w, http.StatusUnauthorized, "غير مصرح")
		return
	}

	var balance float64
	var currency sql.NullString
	err := config.DB.QueryRow(`
		SELECT balance, currency FROM wallets WHERE user_id = $1
	`, user.ID).Scan(&balance, &currency)

	if err == sql.ErrNoRows {
		utils.RespondSuccess(w, map[string]interface{}{
			"balance":  0,
			"currency": "SAR",
		})
		return
	}

	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "خطأ في الخادم")
		return
	}

	currencyStr := "SAR"
	if currency.Valid {
		currencyStr = currency.String
	}

	utils.RespondSuccess(w, map[string]interface{}{
		"balance":  balance,
		"currency": currencyStr,
	})
}

func getTransactionsHandler(w http.ResponseWriter, r *http.Request) {
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
		SELECT t.id, t.type, t.amount, t.balance_before, t.balance_after, 
		       t.description, t.reference_id, t.created_at
		FROM transactions t
		JOIN wallets w ON t.wallet_id = w.id
		WHERE w.user_id = $1
		ORDER BY t.created_at DESC
		LIMIT $2 OFFSET $3
	`, user.ID, limit, offset)

	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "خطأ في الخادم")
		return
	}
	defer rows.Close()

	var transactions []map[string]interface{}
	for rows.Next() {
		var id, transType, description string
		var referenceID sql.NullString
		var amount, balanceBefore, balanceAfter float64
		var createdAt sql.NullTime

		if err := rows.Scan(&id, &transType, &amount, &balanceBefore, &balanceAfter, 
			&description, &referenceID, &createdAt); err != nil {
			continue
		}

		trans := map[string]interface{}{
			"id":             id,
			"type":           transType,
			"amount":         amount,
			"balance_before": balanceBefore,
			"balance_after":  balanceAfter,
			"description":    description,
			"created_at":     createdAt.Time,
		}

		if referenceID.Valid {
			trans["reference_id"] = referenceID.String
		}

		transactions = append(transactions, trans)
	}

	utils.RespondSuccess(w, transactions)
}

func addBalanceHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID      string  `json:"user_id"`
		Amount      float64 `json:"amount"`
		Description string  `json:"description"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "بيانات غير صالحة")
		return
	}

	if req.UserID == "" || req.Amount <= 0 {
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

	// Get wallet with lock
	var walletID string
	var balance float64
	err = tx.QueryRow(`
		SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE
	`, req.UserID).Scan(&walletID, &balance)

	if err == sql.ErrNoRows {
		utils.RespondError(w, http.StatusNotFound, "المحفظة غير موجودة")
		return
	}

	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "خطأ في الخادم")
		return
	}

	// Update balance
	newBalance := balance + req.Amount
	_, err = tx.Exec(`
		UPDATE wallets SET balance = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`, newBalance, walletID)

	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "خطأ في الخادم")
		return
	}

	// Create transaction record
	description := req.Description
	if description == "" {
		description = "إضافة رصيد من المشرف"
	}

	_, err = tx.Exec(`
		INSERT INTO transactions (wallet_id, user_id, type, amount, balance_before, balance_after, description)
		VALUES ($1, $2, 'deposit', $3, $4, $5, $6)
	`, walletID, req.UserID, req.Amount, balance, newBalance, description)

	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "خطأ في الخادم")
		return
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "خطأ في الخادم")
		return
	}

	utils.RespondSuccess(w, map[string]interface{}{
		"message":     "تم إضافة الرصيد بنجاح",
		"new_balance": newBalance,
	})
}
