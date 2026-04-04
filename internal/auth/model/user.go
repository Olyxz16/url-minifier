package model

import (
	"errors"

	"github.com/google/uuid"
)

var ErrUserNotFound = errors.New("user not found")

type User struct {
	ID       uuid.UUID
	Email    string
	Provider Provider
}
