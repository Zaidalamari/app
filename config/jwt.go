package config

import "os"

// GetJWTSecret returns the JWT secret from environment or default
func GetJWTSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "digicards-secret-key-2024"
	}
	return []byte(secret)
}
