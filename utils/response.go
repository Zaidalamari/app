package utils

import (
	"encoding/json"
	"log"
	"net/http"
)

// RespondJSON sends a JSON response
func RespondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("Error encoding JSON response: %v", err)
	}
}

// RespondError sends an error JSON response
func RespondError(w http.ResponseWriter, status int, message string) {
	RespondJSON(w, status, map[string]interface{}{
		"success": false,
		"message": message,
	})
}

// RespondSuccess sends a success JSON response
func RespondSuccess(w http.ResponseWriter, data interface{}) {
	response := map[string]interface{}{
		"success": true,
	}
	if data != nil {
		if m, ok := data.(map[string]interface{}); ok {
			for k, v := range m {
				response[k] = v
			}
		} else {
			response["data"] = data
		}
	}
	RespondJSON(w, http.StatusOK, response)
}
