package models

import (
	"time"
)

// User represents a user in the system
type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	Name         string    `json:"name"`
	Phone        string    `json:"phone"`
	Role         string    `json:"role"`
	IsActive     bool      `json:"is_active"`
	APIKey       string    `json:"api_key,omitempty"`
	APISecret    string    `json:"-"`
	ReferralCode string    `json:"referral_code"`
	ReferredBy   *string   `json:"referred_by,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

// Product represents a product
type Product struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	CategoryID  string  `json:"category_id"`
	IsActive    bool    `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
}

// Order represents an order
type Order struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	ProductID string    `json:"product_id"`
	Quantity  int       `json:"quantity"`
	Total     float64   `json:"total"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

// Wallet represents a user's wallet
type Wallet struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Balance   float64   `json:"balance"`
	CreatedAt time.Time `json:"created_at"`
}

// Transaction represents a wallet transaction
type Transaction struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Type      string    `json:"type"`
	Amount    float64   `json:"amount"`
	Balance   float64   `json:"balance"`
	Reference string    `json:"reference"`
	CreatedAt time.Time `json:"created_at"`
}
