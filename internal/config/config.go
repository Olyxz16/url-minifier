package config

import (
	"github.com/caarlos0/env"
)

type ServerConfig struct {
	Host         string `env:"HOST"  envDefault:"0.0.0.0"`
	Port         int    `env:"PORT"  envDefault:"8080"`
	Debug        bool   `env:"DEBUG" envDefault:"false"`
	TokenSecret  string `env:"TOKEN_SECRET" envDefault:"supersecretkeymustbe32byteslong!"`
	RateLimitRPM int    `env:"RATE_LIMIT_RPM" envDefault:"30"`
}

type PostgresConfig struct {
	Host     string `env:"POSTGRES_HOST"     envDefault:"localhost"`
	Port     int    `env:"POSTGRES_PORT"     envDefault:"5432"`
	User     string `env:"POSTGRES_USER"     envDefault:"postgres"`
	Password string `env:"POSTGRES_PASSWORD" envDefault:"postgres"`
	DBName   string `env:"POSTGRES_DB"       envDefault:"app"`
	SSLMode  string `env:"POSTGRES_SSLMODE"  envDefault:"disable"`
}

type GothConfig struct {
	GoogleAccessKeyId     string `env:"GOOGLE_ACCESS_KEY_ID,required"`
	GoogleSecretAccessKey string `env:"GOOGLE_SECRET_ACCESS_KEY,required"`
	GoogleCallbackUrl	  string `env:"GOOGLE_CALLBACK_URL,required"`
}

type RedisConfig struct {
    Host     string `env:"REDIS_HOST" envDefault:"localhost"`
    Port     int    `env:"REDIS_PORT" envDefault:"6379"`
    Password string `env:"REDIS_PASSWORD" envDefault:""`
    DB       int    `env:"REDIS_DB" envDefault:"0"`
}

func NewServerConfig() *ServerConfig {
	cfg := &ServerConfig{}
	if err := env.Parse(cfg); err != nil {
		panic(err.Error())
	}
	return cfg
}

func NewPostgresConfig() *PostgresConfig {
	cfg := &PostgresConfig{}
	if err := env.Parse(cfg); err != nil {
		panic(err.Error())
	}
	return cfg
}

func NewGothConfig() *GothConfig {
	cfg := &GothConfig{}
	if err := env.Parse(cfg); err != nil {
		panic(err.Error())
	}
	return cfg
}

func NewRedisConfig() *RedisConfig {
    cfg := &RedisConfig{}
    if err := env.Parse(cfg); err != nil {
        panic(err.Error())
    }
    return cfg
}
