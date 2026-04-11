package services

import (
	"fmt"
	"time"

	"github.com/Olyxz16/go-chi-oauth-psql/internal/auth/model"
	"github.com/o1egl/paseto"
)

type TokenService struct {
	secret []byte
	paseto *paseto.V2
}

func NewTokenService(secret []byte) (*TokenService, error) {
	if len(secret) != 32 {
		return nil, fmt.Errorf("Token secret must be 32 bytes long")
	}
	return &TokenService{
		secret: secret,
		paseto: paseto.NewV2(),
	}, nil
}

func (s *TokenService) GenerateTokens(user *model.User) (string, string, error) {
	now := time.Now()
	exp := now.Add(24 * time.Hour)
	nbt := now

	jsonToken := paseto.JSONToken{
		Audience:   "cli-app",
		Issuer:     "go-chi-oauth-psql",
		Jti:        user.ID.String(),
		Subject:    user.Email,
		IssuedAt:   now,
		Expiration: exp,
		NotBefore:  nbt,
	}

	// Access Token
	accessToken, err := s.paseto.Encrypt(s.secret, jsonToken, "access_token")
	if err != nil {
		return "", "", err
	}

	// Refresh Token
	refreshExp := now.Add(7 * 24 * time.Hour)
	jsonToken.Expiration = refreshExp
	refreshToken, err := s.paseto.Encrypt(s.secret, jsonToken, "refresh_token")
	if err != nil {
		return "", "", err
	}

	return accessToken, refreshToken, nil
}

func (s *TokenService) ValidateAccessToken(tokenStr string) (*paseto.JSONToken, error) {
	var token paseto.JSONToken
	var footer string
	err := s.paseto.Decrypt(tokenStr, s.secret, &token, &footer)
	if err != nil {
		return nil, err
	}

	if footer != "access_token" {
		return nil, paseto.ErrInvalidTokenAuth
	}

	if err := token.Validate(paseto.IssuedBy("go-chi-oauth-psql"), paseto.ForAudience("cli-app")); err != nil {
		return nil, err
	}

	return &token, nil
}

func (s *TokenService) ValidateRefreshToken(tokenStr string) (*paseto.JSONToken, error) {
	var token paseto.JSONToken
	var footer string
	err := s.paseto.Decrypt(tokenStr, s.secret, &token, &footer)
	if err != nil {
		return nil, err
	}

	if footer != "refresh_token" {
		return nil, paseto.ErrInvalidTokenAuth
	}

	if err := token.Validate(paseto.IssuedBy("go-chi-oauth-psql"), paseto.ForAudience("cli-app")); err != nil {
		return nil, err
	}

	return &token, nil
}
