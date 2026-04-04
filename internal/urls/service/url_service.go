package service

import (
	"context"

	"github.com/Olyxz16/go-chi-oauth-psql/internal/urls/model"
	"github.com/Olyxz16/go-chi-oauth-psql/internal/urls/repositories"
	"github.com/google/uuid"
)

type UrlService struct {
	repo *repositories.UrlRepository
}

func NewUrlService(repo *repositories.UrlRepository) *UrlService {
	return &UrlService{
		repo: repo,
	}
}

func (s *UrlService) CreateUrl(ctx context.Context, creatorID uuid.UUID, redirectUrl string) (*model.Url, error) {
	url, err := model.NewUrl(creatorID, redirectUrl)
	if err != nil {
		return nil, err
	}
	return s.repo.CreateUrl(ctx, url)
}

func (s *UrlService) GetUrlByShort(ctx context.Context, shortUrl string) (*model.Url, error) {
	return s.repo.GetUrlByShort(ctx, shortUrl)
}

func (s *UrlService) GetUrlById(ctx context.Context, id uuid.UUID) (*model.Url, error) {
	return s.repo.GetUrlById(ctx, id.String())
}

func (s *UrlService) DeleteUrl(ctx context.Context, id uuid.UUID) error {
	return s.repo.DeleteUrl(ctx, id.String())
}

func (s *UrlService) IncrementHitCount(ctx context.Context, id uuid.UUID) error {
	return s.repo.UpdateHitCount(ctx, id.String())
}
