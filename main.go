package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/Zaidalamari/app/config"
	"github.com/Zaidalamari/app/middleware"
	"github.com/Zaidalamari/app/routes"
	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
)

func main() {
	// Load .env file if it exists
	godotenv.Load()

	// Initialize database
	if err := config.InitDB(); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer config.CloseDB()

	// Create router
	router := mux.NewRouter()

	// Apply cache control middleware
	router.Use(middleware.CacheControl)

	// Register routes
	routes.RegisterAuthRoutes(router)
	routes.RegisterProductRoutes(router)
	routes.RegisterOrderRoutes(router)
	routes.RegisterWalletRoutes(router)
	routes.RegisterAPIRoutes(router)
	routes.RegisterAdminRoutes(router)
	routes.RegisterChatRoutes(router)
	routes.RegisterPaymentRoutes(router)
	routes.RegisterMarketingRoutes(router)
	routes.RegisterCurrencyRoutes(router)
	routes.RegisterReferralRoutes(router)
	routes.RegisterSupportRoutes(router)

	// Serve static files from client/dist
	staticDir := "./client/dist"
	if _, err := os.Stat(staticDir); err == nil {
		router.PathPrefix("/").Handler(http.FileServer(http.Dir(staticDir)))
	}

	// Configure CORS
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})

	handler := c.Handler(router)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Printf("Server starting on port %s", port)
	if err := server.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
