package routes

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"github.com/Zaidalamari/app/config"
	"github.com/Zaidalamari/app/middleware"
	"github.com/Zaidalamari/app/models"
	"github.com/Zaidalamari/app/utils"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"golang.org/x/crypto/bcrypt"
)

// RegisterAuthRoutes registers authentication routes
func RegisterAuthRoutes(router *mux.Router) {
	router.HandleFunc("/api/auth/register", registerHandler).Methods("POST")
	router.HandleFunc("/api/auth/login", loginHandler).Methods("POST")
	router.Handle("/api/auth/profile", middleware.AuthenticateToken(http.HandlerFunc(profileHandler))).Methods("GET")
}

func registerHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email        string  `json:"email"`
		Password     string  `json:"password"`
		Name         string  `json:"name"`
		Phone        string  `json:"phone"`
		Role         string  `json:"role"`
		ReferralCode string  `json:"referral_code"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "بيانات غير صالحة")
		return
	}

	if req.Email == "" || req.Password == "" || req.Name == "" {
		utils.RespondError(w, http.StatusBadRequest, "جميع الحقول مطلوبة")
		return
	}

	// Check if email exists
	var existingID string
	err := config.DB.QueryRow("SELECT id FROM users WHERE email = $1", req.Email).Scan(&existingID)
	if err == nil {
		utils.RespondError(w, http.StatusBadRequest, "البريد الإلكتروني مسجل مسبقاً")
		return
	}

	// Handle referral code
	var referrerId *string
	if req.ReferralCode != "" {
		var referrerID string
		err := config.DB.QueryRow("SELECT id FROM users WHERE referral_code = $1", req.ReferralCode).Scan(&referrerID)
		if err == nil {
			referrerId = &referrerID
		}
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), 10)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "خطأ في الخادم")
		return
	}

	// Generate API credentials
	apiKey := "dk_" + uuid.New().String()
	apiSecret := "ds_" + uuid.New().String()
	referralCode := generateReferralCode()

	// Set default role
	if req.Role == "" {
		req.Role = "seller"
	}

	// Insert user
	var user models.User
	err = config.DB.QueryRow(`
		INSERT INTO users (email, password, name, phone, role, api_key, api_secret, referral_code, referred_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, email, name, phone, role, api_key, referral_code, created_at
	`, req.Email, string(hashedPassword), req.Name, req.Phone, req.Role, apiKey, apiSecret, referralCode, referrerId).
		Scan(&user.ID, &user.Email, &user.Name, &user.Phone, &user.Role, &user.APIKey, &user.ReferralCode, &user.CreatedAt)

	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "خطأ في الخادم")
		return
	}

	// Create wallet
	_, err = config.DB.Exec("INSERT INTO wallets (user_id, balance) VALUES ($1, $2)", user.ID, 0)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "خطأ في الخادم")
		return
	}

	// Generate JWT token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userId": user.ID,
		"role":   user.Role,
		"exp":    time.Now().Add(7 * 24 * time.Hour).Unix(),
	})

	tokenString, err := token.SignedString(getJWTSecret())
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "خطأ في الخادم")
		return
	}

	utils.RespondSuccess(w, map[string]interface{}{
		"message": "تم التسجيل بنجاح",
		"user":    user,
		"token":   tokenString,
	})
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondError(w, http.StatusBadRequest, "بيانات غير صالحة")
		return
	}

	if req.Email == "" || req.Password == "" {
		utils.RespondError(w, http.StatusBadRequest, "البريد الإلكتروني وكلمة المرور مطلوبان")
		return
	}

	// Fetch user
	var user models.User
	var password string
	err := config.DB.QueryRow(`
		SELECT id, email, password, name, phone, role, is_active, api_key, referral_code, created_at
		FROM users WHERE email = $1
	`, req.Email).Scan(&user.ID, &user.Email, &password, &user.Name, &user.Phone, 
		&user.Role, &user.IsActive, &user.APIKey, &user.ReferralCode, &user.CreatedAt)

	if err == sql.ErrNoRows {
		utils.RespondError(w, http.StatusUnauthorized, "بيانات تسجيل الدخول غير صحيحة")
		return
	}

	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "خطأ في الخادم")
		return
	}

	if !user.IsActive {
		utils.RespondError(w, http.StatusUnauthorized, "الحساب معطل")
		return
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(password), []byte(req.Password)); err != nil {
		utils.RespondError(w, http.StatusUnauthorized, "بيانات تسجيل الدخول غير صحيحة")
		return
	}

	// Get wallet balance
	var balance float64
	err = config.DB.QueryRow("SELECT balance FROM wallets WHERE user_id = $1", user.ID).Scan(&balance)
	if err != nil {
		balance = 0
	}

	// Generate JWT token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userId": user.ID,
		"role":   user.Role,
		"exp":    time.Now().Add(7 * 24 * time.Hour).Unix(),
	})

	tokenString, err := token.SignedString(getJWTSecret())
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "خطأ في الخادم")
		return
	}

	utils.RespondSuccess(w, map[string]interface{}{
		"message": "تم تسجيل الدخول بنجاح",
		"user": map[string]interface{}{
			"id":      user.ID,
			"email":   user.Email,
			"name":    user.Name,
			"role":    user.Role,
			"api_key": user.APIKey,
		},
		"balance": balance,
		"token":   tokenString,
	})
}

func profileHandler(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		utils.RespondError(w, http.StatusUnauthorized, "غير مصرح")
		return
	}

	// Get wallet balance
	var balance float64
	err := config.DB.QueryRow("SELECT balance FROM wallets WHERE user_id = $1", user.ID).Scan(&balance)
	if err != nil {
		balance = 0
	}

	utils.RespondSuccess(w, map[string]interface{}{
		"user": map[string]interface{}{
			"id":            user.ID,
			"email":         user.Email,
			"name":          user.Name,
			"phone":         user.Phone,
			"role":          user.Role,
			"api_key":       user.APIKey,
			"referral_code": user.ReferralCode,
		},
		"balance": balance,
	})
}

func getJWTSecret() []byte {
	// This should match the secret in middleware/auth.go
	return []byte("digicards-secret-key-2024")
}

func generateReferralCode() string {
	return uuid.New().String()[:8]
}
