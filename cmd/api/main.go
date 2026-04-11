package main

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/Olyxz16/go-chi-oauth-psql/internal/api"
	"github.com/Olyxz16/go-chi-oauth-psql/internal/auth/repositories"
	"github.com/Olyxz16/go-chi-oauth-psql/internal/auth/services"
	"github.com/Olyxz16/go-chi-oauth-psql/internal/config"
	urlrepos "github.com/Olyxz16/go-chi-oauth-psql/internal/urls/repositories"
	urlservices "github.com/Olyxz16/go-chi-oauth-psql/internal/urls/service"
	"github.com/go-redis/redis_rate/v10"
	"go.uber.org/zap"
)

func main() {
	logger := config.DefaultLogger()

	pgCfg := config.NewPostgresConfig()
	pool, err := config.NewPostgresPool(pgCfg)
	if err != nil {
		logger.Fatal("Failed to connect to postgres", zap.Error(err))
	}
	defer pool.Close()

	redisCfg := config.NewRedisConfig()
	redisClient, err := config.NewRedisClient(redisCfg)
	if err != nil {
		logger.Fatal("Failed to connect to redis", zap.Error(err))
	}
	defer redisClient.Close()

	limiter := redis_rate.NewLimiter(redisClient)

	gothConf := config.NewGothConfig()
	config.SetupGoth(gothConf)

	cfg := config.NewServerConfig()
	userRepo := repositories.NewUserRepository(pool)
	userService := services.NewUserService(userRepo)

	tokenSecret := strings.TrimSpace(cfg.TokenSecret)
	tokenService, err := services.NewTokenService(tokenSecret)
	if err != nil {
		panic(err)
	}

	urlRepo := urlrepos.NewUrlRepository(pool)
	urlService := urlservices.NewUrlService(urlRepo)

	server := &http.Server{
		Addr:    fmt.Sprintf("%s:%d", cfg.Host, cfg.Port),
		Handler: api.RegisterRoutes(userService, tokenService, urlService, gothConf.GoogleAccessKeyId, limiter, cfg.RateLimitRPM),
	}

	if err = server.ListenAndServe(); err != nil {
		logger.Fatal("Server failed. ", zap.Error(err))
	}

}
