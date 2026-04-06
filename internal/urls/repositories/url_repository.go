package repositories

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/Olyxz16/go-chi-oauth-psql/internal/db"
	"github.com/Olyxz16/go-chi-oauth-psql/internal/urls/model"
	"github.com/google/uuid"
)

type UrlRepository struct {
	queries *db.Queries
}

func NewUrlRepository(pool *pgxpool.Pool) *UrlRepository {
	return &UrlRepository{queries: db.New(pool)}
}

func (r *UrlRepository) CreateUrl(ctx context.Context, u *model.Url) (*model.Url, error) {
	var id pgtype.UUID
	copy(id.Bytes[:], u.ID[:])
	id.Valid = true

	var creatorID pgtype.UUID
	copy(creatorID.Bytes[:], u.CreatorID[:])
	creatorID.Valid = true

	dbUrl, err := r.queries.CreateUrl(ctx, db.CreateUrlParams{
		ID:          id,
		CreatorID:   creatorID,
		ShortUrl:    u.ShortUrl,
		RedirectUrl: u.RedirectUrl,
	})
	if err != nil {
		return nil, err
	}

	return toModelUrl(dbUrl), nil
}

func (r *UrlRepository) GetUrlById(ctx context.Context, idStr string) (*model.Url, error) {
	parsedID, err := uuid.Parse(idStr)
	if err != nil {
		return nil, err
	}

	var id pgtype.UUID
	copy(id.Bytes[:], parsedID[:])
	id.Valid = true

	dbUrl, err := r.queries.GetUrlById(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, model.ErrUrlNotFound
		}
		return nil, err
	}

	return toModelUrl(dbUrl), nil
}

func (r *UrlRepository) GetUrlByShort(ctx context.Context, shortUrl string) (*model.Url, error) {
	dbUrl, err := r.queries.GetUrlByShort(ctx, shortUrl)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, model.ErrUrlNotFound
		}
		return nil, err
	}

	return toModelUrl(dbUrl), nil
}

func (r *UrlRepository) DeleteUrl(ctx context.Context, idStr string) error {
	parsedID, err := uuid.Parse(idStr)
	if err != nil {
		return err
	}

	var id pgtype.UUID
	copy(id.Bytes[:], parsedID[:])
	id.Valid = true

	return r.queries.DeleteUrl(ctx, id)
}

func (r *UrlRepository) UpdateHitCount(ctx context.Context, idStr string) error {
	parsedID, err := uuid.Parse(idStr)
	if err != nil {
		return err
	}

	var id pgtype.UUID
	copy(id.Bytes[:], parsedID[:])
	id.Valid = true

	return r.queries.UpdateHitCount(ctx, id)
}

func toModelUrl(dbUrl db.Url) *model.Url {
	var uID uuid.UUID
	copy(uID[:], dbUrl.ID.Bytes[:])

	var creatorID uuid.UUID
	copy(creatorID[:], dbUrl.CreatorID.Bytes[:])

	var expiresAt *time.Time
	if dbUrl.ExpiresAt.Valid {
		expiresAt = &dbUrl.ExpiresAt.Time
	}

	return &model.Url{
		ID:          uID,
		CreatorID:   creatorID,
		ShortUrl:    dbUrl.ShortUrl,
		RedirectUrl: dbUrl.RedirectUrl,
		HitCount:    int(dbUrl.HitCount),
		CreatedAt:   dbUrl.CreatedAt.Time,
		ExpiresAt:   expiresAt,
	}
}
