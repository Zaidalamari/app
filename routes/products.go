package routes

import (
	"database/sql"
	"net/http"

	"github.com/Zaidalamari/app/config"
	"github.com/Zaidalamari/app/utils"
	"github.com/gorilla/mux"
)

// RegisterProductRoutes registers product routes
func RegisterProductRoutes(router *mux.Router) {
	router.HandleFunc("/api/products/categories", getCategoriesHandler).Methods("GET")
	router.HandleFunc("/api/products", getProductsHandler).Methods("GET")
	router.HandleFunc("/api/products/{id}", getProductHandler).Methods("GET")
}

func getCategoriesHandler(w http.ResponseWriter, r *http.Request) {
	rows, err := config.DB.Query(`
		SELECT id, name, name_ar, icon, is_active, created_at
		FROM categories
		WHERE is_active = true
		ORDER BY name
	`)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "خطأ في الخادم")
		return
	}
	defer rows.Close()

	var categories []map[string]interface{}
	for rows.Next() {
		var id, name, nameAr, icon string
		var isActive bool
		var createdAt sql.NullTime

		if err := rows.Scan(&id, &name, &nameAr, &icon, &isActive, &createdAt); err != nil {
			continue
		}

		categories = append(categories, map[string]interface{}{
			"id":         id,
			"name":       name,
			"name_ar":    nameAr,
			"icon":       icon,
			"is_active":  isActive,
			"created_at": createdAt.Time,
		})
	}

	utils.RespondSuccess(w, categories)
}

func getProductsHandler(w http.ResponseWriter, r *http.Request) {
	categoryID := r.URL.Query().Get("category_id")
	search := r.URL.Query().Get("search")

	query := `
		SELECT p.id, p.name, p.name_ar, p.description, p.description_ar, p.price, 
		       p.category_id, p.image_url, p.is_active, p.created_at,
		       c.name as category_name, c.name_ar as category_name_ar,
		       (SELECT COUNT(*) FROM card_codes WHERE product_id = p.id AND is_sold = false) as available_stock
		FROM products p
		LEFT JOIN categories c ON p.category_id = c.id
		WHERE p.is_active = true
	`
	
	var args []interface{}
	argIndex := 1

	if categoryID != "" {
		query += " AND p.category_id = $" + string(rune(argIndex+'0'))
		args = append(args, categoryID)
		argIndex++
	}

	if search != "" {
		query += " AND (p.name ILIKE $" + string(rune(argIndex+'0')) + " OR p.name_ar ILIKE $" + string(rune(argIndex+'0')) + ")"
		args = append(args, "%"+search+"%")
	}

	query += " ORDER BY p.created_at DESC"

	rows, err := config.DB.Query(query, args...)
	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "خطأ في الخادم")
		return
	}
	defer rows.Close()

	var products []map[string]interface{}
	for rows.Next() {
		var id, name, nameAr, description, descriptionAr, categoryID, imageURL, categoryName, categoryNameAr string
		var price float64
		var isActive bool
		var availableStock int
		var createdAt sql.NullTime

		if err := rows.Scan(&id, &name, &nameAr, &description, &descriptionAr, &price, 
			&categoryID, &imageURL, &isActive, &createdAt, &categoryName, &categoryNameAr, &availableStock); err != nil {
			continue
		}

		products = append(products, map[string]interface{}{
			"id":                id,
			"name":              name,
			"name_ar":           nameAr,
			"description":       description,
			"description_ar":    descriptionAr,
			"price":             price,
			"category_id":       categoryID,
			"image_url":         imageURL,
			"is_active":         isActive,
			"category_name":     categoryName,
			"category_name_ar":  categoryNameAr,
			"available_stock":   availableStock,
			"created_at":        createdAt.Time,
		})
	}

	utils.RespondSuccess(w, products)
}

func getProductHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	productID := vars["id"]

	var id, name, nameAr, description, descriptionAr, categoryID, imageURL, categoryName string
	var price float64
	var isActive bool
	var availableStock int
	var createdAt sql.NullTime

	err := config.DB.QueryRow(`
		SELECT p.id, p.name, p.name_ar, p.description, p.description_ar, p.price,
		       p.category_id, p.image_url, p.is_active, p.created_at,
		       c.name as category_name,
		       (SELECT COUNT(*) FROM card_codes WHERE product_id = p.id AND is_sold = false) as available_stock
		FROM products p
		LEFT JOIN categories c ON p.category_id = c.id
		WHERE p.id = $1
	`, productID).Scan(&id, &name, &nameAr, &description, &descriptionAr, &price,
		&categoryID, &imageURL, &isActive, &createdAt, &categoryName, &availableStock)

	if err == sql.ErrNoRows {
		utils.RespondError(w, http.StatusNotFound, "المنتج غير موجود")
		return
	}

	if err != nil {
		utils.RespondError(w, http.StatusInternalServerError, "خطأ في الخادم")
		return
	}

	product := map[string]interface{}{
		"id":              id,
		"name":            name,
		"name_ar":         nameAr,
		"description":     description,
		"description_ar":  descriptionAr,
		"price":           price,
		"category_id":     categoryID,
		"image_url":       imageURL,
		"is_active":       isActive,
		"category_name":   categoryName,
		"available_stock": availableStock,
		"created_at":      createdAt.Time,
	}

	utils.RespondSuccess(w, product)
}
