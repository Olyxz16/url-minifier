package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-redis/redis_rate/v10"
	"github.com/prometheus/client_golang/prometheus/promhttp"

	"github.com/Olyxz16/go-chi-oauth-psql/internal/api/middlewares"

	authcontroller "github.com/Olyxz16/go-chi-oauth-psql/internal/auth/controller"
	"github.com/Olyxz16/go-chi-oauth-psql/internal/auth/services"
	urlcontroller "github.com/Olyxz16/go-chi-oauth-psql/internal/urls/controller"
	urlservice "github.com/Olyxz16/go-chi-oauth-psql/internal/urls/service"
)

func RegisterRoutes(userService *services.UserService, tokenService *services.TokenService, urlService *urlservice.UrlService, googleClientID string, limiter *redis_rate.Limiter, rpm int) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.Recoverer)
	r.Use(middlewares.MetricsMiddleware)

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	r.Handle("/metrics", promhttp.Handler())

	r.Group(func(r chi.Router) {
		r.Use(middleware.Logger)
		r.Use(middlewares.RateLimitMiddleware(limiter, rpm))
		r.Mount("/auth", authcontroller.AuthController(userService, tokenService, googleClientID))
		r.Mount("/urls", urlcontroller.UrlController(urlService, tokenService))
	})

	return r
}
