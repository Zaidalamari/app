package middleware

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/Zaidalamari/app/config"
	"github.com/Zaidalamari/app/models"
	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const UserContextKey contextKey = "user"

// AuthenticateToken middleware validates JWT tokens
func AuthenticateToken(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			respondJSON(w, http.StatusUnauthorized, map[string]interface{}{
				"success": false,
				"message": "غير مصرح - لم يتم توفير رمز الوصول",
			})
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			respondJSON(w, http.StatusUnauthorized, map[string]interface{}{
				"success": false,
				"message": "غير مصرح - تنسيق رمز الوصول غير صحيح",
			})
			return
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return config.GetJWTSecret(), nil
		})

		if err != nil || !token.Valid {
			respondJSON(w, http.StatusForbidden, map[string]interface{}{
				"success": false,
				"message": "رمز الوصول غير صالح",
			})
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			respondJSON(w, http.StatusForbidden, map[string]interface{}{
				"success": false,
				"message": "رمز الوصول غير صالح",
			})
			return
		}

		userID, ok := claims["userId"].(string)
		if !ok {
			respondJSON(w, http.StatusForbidden, map[string]interface{}{
				"success": false,
				"message": "رمز الوصول غير صالح",
			})
			return
		}

		// Fetch user from database
		var user models.User
		err = config.DB.QueryRow(`
			SELECT id, email, name, phone, role, is_active, api_key, referral_code, created_at
			FROM users WHERE id = $1 AND is_active = true
		`, userID).Scan(&user.ID, &user.Email, &user.Name, &user.Phone, &user.Role, 
			&user.IsActive, &user.APIKey, &user.ReferralCode, &user.CreatedAt)

		if err == sql.ErrNoRows {
			respondJSON(w, http.StatusUnauthorized, map[string]interface{}{
				"success": false,
				"message": "المستخدم غير موجود أو غير نشط",
			})
			return
		}

		if err != nil {
			respondJSON(w, http.StatusInternalServerError, map[string]interface{}{
				"success": false,
				"message": "خطأ في الخادم",
			})
			return
		}

		ctx := context.WithValue(r.Context(), UserContextKey, &user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// AuthenticateAPIKey middleware validates API keys
func AuthenticateAPIKey(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		apiKey := r.Header.Get("X-API-Key")
		apiSecret := r.Header.Get("X-API-Secret")

		if apiKey == "" || apiSecret == "" {
			respondJSON(w, http.StatusUnauthorized, map[string]interface{}{
				"success": false,
				"message": "مفتاح API غير صالح",
			})
			return
		}

		var user models.User
		err := config.DB.QueryRow(`
			SELECT id, email, name, phone, role, is_active, api_key, referral_code, created_at
			FROM users WHERE api_key = $1 AND api_secret = $2 AND is_active = true
		`, apiKey, apiSecret).Scan(&user.ID, &user.Email, &user.Name, &user.Phone, 
			&user.Role, &user.IsActive, &user.APIKey, &user.ReferralCode, &user.CreatedAt)

		if err == sql.ErrNoRows {
			respondJSON(w, http.StatusUnauthorized, map[string]interface{}{
				"success": false,
				"message": "مفتاح API غير صالح",
			})
			return
		}

		if err != nil {
			respondJSON(w, http.StatusInternalServerError, map[string]interface{}{
				"success": false,
				"message": "خطأ في الخادم",
			})
			return
		}

		// Log API request
		_, _ = config.DB.Exec(`
			INSERT INTO api_logs (user_id, endpoint, method, ip_address)
			VALUES ($1, $2, $3, $4)
		`, user.ID, r.URL.Path, r.Method, r.RemoteAddr)

		ctx := context.WithValue(r.Context(), UserContextKey, &user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// IsAdmin middleware checks if user is admin
func IsAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user := GetUserFromContext(r.Context())
		if user == nil || user.Role != "admin" {
			respondJSON(w, http.StatusForbidden, map[string]interface{}{
				"success": false,
				"message": "غير مصرح - صلاحيات المشرف مطلوبة",
			})
			return
		}
		next.ServeHTTP(w, r)
	})
}

// IsDistributor middleware checks if user is distributor or admin
func IsDistributor(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user := GetUserFromContext(r.Context())
		if user == nil || (user.Role != "distributor" && user.Role != "admin") {
			respondJSON(w, http.StatusForbidden, map[string]interface{}{
				"success": false,
				"message": "غير مصرح - صلاحيات الموزع مطلوبة",
			})
			return
		}
		next.ServeHTTP(w, r)
	})
}

// GetUserFromContext retrieves user from context
func GetUserFromContext(ctx context.Context) *models.User {
	user, ok := ctx.Value(UserContextKey).(*models.User)
	if !ok {
		return nil
	}
	return user
}

// respondJSON sends a JSON response
func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}
