package controller

import (
	"encoding/json"
	"net/http"

	"github.com/Olyxz16/go-chi-oauth-psql/internal/auth/services"
	"go.uber.org/zap"
)

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

func HandleRefresh(userService *services.UserService, tokenService *services.TokenService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req RefreshRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			zap.L().Error("Error decoding body", zap.Error(err))
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		// Validate Refresh Token
		token, err := tokenService.ValidateRefreshToken(req.RefreshToken)
		if err != nil {
			zap.L().Error("Error validating token", zap.Error(err))
			http.Error(w, "Invalid or expired refresh token", http.StatusUnauthorized)
			return
		}

		// Verify user still exists
		// Token Subject is Email
		user, err := userService.GetUserByMail(r.Context(), token.Subject)
		if err != nil {
			zap.L().Error("Error fetching user", zap.Error(err))
			http.Error(w, "User not found or access revoked", http.StatusUnauthorized)
			return
		}

		// Generate new pair
		accessToken, refreshToken, err := tokenService.GenerateTokens(user)
		if err != nil {
			zap.L().Error("Error generating token", zap.Error(err))
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(AuthResponse{
			AccessToken:  accessToken,
			RefreshToken: refreshToken,
		})
	}
}
