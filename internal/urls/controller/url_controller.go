package controller

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"github.com/Olyxz16/go-chi-oauth-psql/internal/api/middlewares"
	authservices "github.com/Olyxz16/go-chi-oauth-psql/internal/auth/services"
	"github.com/Olyxz16/go-chi-oauth-psql/internal/urls/model"
	"github.com/Olyxz16/go-chi-oauth-psql/internal/urls/service"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type CreateUrlRequest struct {
	RedirectUrl string `json:"redirect_url"`
}

type UrlResponse struct {
	ID          string `json:"id"`
	ShortUrl    string `json:"short_url"`
	RedirectUrl string `json:"redirect_url"`
	HitCount    int    `json:"hit_count"`
}

func UrlController(urlService *service.UrlService, tokenService *authservices.TokenService) *chi.Mux {
	r := chi.NewRouter()

	r.Get("/{shortUrl}", HandleRedirect(urlService))

	r.Group(func(r chi.Router) {
		r.Use(middlewares.AuthMiddleware(tokenService))
		r.Post("/", HandleCreateUrl(urlService))
		r.Get("/info/{id}", HandleGetUrlInfo(urlService))
		r.Delete("/{id}", HandleDeleteUrl(urlService))
	})

	return r
}

func HandleCreateUrl(s *service.UrlService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req CreateUrlRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			zap.L().Error("Error decoding request", zap.Any("req", req), zap.Error(err))
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		userIDStr, ok := r.Context().Value(middlewares.UserIDKey).(string)
		if !ok {
			http.Error(w, "User ID not found in context", http.StatusUnauthorized)
			return
		}

		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			zap.L().Error("Error parsing user id", zap.String("user_id", userID.String()), zap.Error(err))
			http.Error(w, "Invalid user ID in context", http.StatusUnauthorized)
			return
		}

		url, err := s.CreateUrl(r.Context(), userID, req.RedirectUrl)
		if err != nil {
			zap.L().Error("Error creating short url", zap.String("user_id", userID.String()), zap.Error(err))
			http.Error(w, "Failed to create short URL", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(toResponse(url))
	}
}

func HandleRedirect(s *service.UrlService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		shortUrl := chi.URLParam(r, "shortUrl")
		if shortUrl == "" {
			http.Error(w, "Short URL required", http.StatusBadRequest)
			return
		}

		url, err := s.GetUrlByShort(r.Context(), shortUrl)
		if err != nil {
			if errors.Is(err, model.ErrUrlNotFound) {
				zap.L().Warn("Failed to fetch url", zap.String("shortUrl", shortUrl))
				http.Error(w, "URL not found", http.StatusNotFound)
				return
			}
			zap.L().Error("Error fetching url", zap.String("shortUrl", shortUrl), zap.Error(err))
			http.Error(w, "Failed to fetch URL", http.StatusInternalServerError)
			return
		}

		go func() {
			var err error
			retries := 3
			remaining := retries
			for remaining > 0 {
				err = s.IncrementHitCount(r.Context(), url.ID)
				retries--
				zap.L().Warn("Failed incrementing url hits but then succeeded", zap.Int("retries", retries-remaining), zap.Any("url", url), zap.Error(err))
			}
			if remaining == 0 {
				zap.L().Error(fmt.Sprintf("Error incrementing url hits"), zap.Int("retries", retries), zap.Any("url", url), zap.Error(err))
			}
		}()

		http.Redirect(w, r, url.RedirectUrl, http.StatusMovedPermanently)
	}
}

func HandleGetUrlInfo(s *service.UrlService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := chi.URLParam(r, "id")
		id, err := uuid.Parse(idStr)
		if err != nil {
			http.Error(w, "Invalid URL ID", http.StatusBadRequest)
			return
		}

		url, err := s.GetUrlById(r.Context(), id)
		if err != nil {
			if errors.Is(err, model.ErrUrlNotFound) {
				zap.L().Warn("Failed to fetch url", zap.String("id", idStr))
				http.Error(w, "URL not found", http.StatusNotFound)
				return
			}
			zap.L().Error("Error fetching url", zap.String("id", idStr), zap.Error(err))
			http.Error(w, "Failed to fetch URL", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(toResponse(url))
	}
}

func HandleDeleteUrl(s *service.UrlService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := chi.URLParam(r, "id")
		id, err := uuid.Parse(idStr)
		if err != nil {
			http.Error(w, "Invalid URL ID", http.StatusBadRequest)
			return
		}

		err = s.DeleteUrl(r.Context(), id)
		if err != nil {
			zap.L().Error("Error fetching url", zap.String("id", idStr), zap.Error(err))
			http.Error(w, "Failed to delete URL", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}

func toResponse(u *model.Url) UrlResponse {
	return UrlResponse{
		ID:          u.ID.String(),
		ShortUrl:    u.ShortUrl,
		RedirectUrl: u.RedirectUrl,
		HitCount:    u.HitCount,
	}
}
