package middlewares

import (
	"context"
	"net/http"
	"strings"

	"github.com/Olyxz16/go-chi-oauth-psql/internal/auth/services"
)

type contextKey string

const (
	UserEmailKey contextKey = "user_email"
	UserIDKey    contextKey = "user_id"
)

func AuthMiddleware(tokenService *services.TokenService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, "Authorization header required", http.StatusUnauthorized)
				return
			}

			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				http.Error(w, "Invalid authorization header format", http.StatusUnauthorized)
				return
			}

			tokenStr := parts[1]
			token, err := tokenService.ValidateAccessToken(tokenStr)
			if err != nil {
				http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), UserEmailKey, token.Subject)
			ctx = context.WithValue(ctx, UserIDKey, token.Jti)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
