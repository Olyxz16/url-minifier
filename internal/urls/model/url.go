package model

import (
	"errors"
	"time"

	"github.com/google/uuid"
	gonanoid "github.com/matoous/go-nanoid/v2"
)

var ErrUrlNotFound = errors.New("url not found")

type Url struct {
	ID          uuid.UUID
	CreatorID   uuid.UUID
	ShortUrl    string
	RedirectUrl string
	HitCount    int
	CreatedAt   time.Time
	ExpiresAt   *time.Time
}

func NewUrl(creatorId uuid.UUID, origin string) (*Url, error) {
	return NewUrlWithExpiration(creatorId, origin, nil)
}

func NewUrlWithExpiration(creatorID uuid.UUID, origin string, expiresAt *time.Time) (*Url, error) {
	id, err := gonanoid.New(8)
	if err != nil {
		return nil, err
	}
	return &Url{
		ID:          uuid.New(),
		CreatorID:   creatorID,
		ShortUrl:    id,
		RedirectUrl: origin,
		HitCount:    0,
		CreatedAt:   time.Now(),
		ExpiresAt:   expiresAt,
	}, nil
}
