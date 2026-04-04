-- name: CreateUrl :one
INSERT INTO urls (id, creator_id, short_url, redirect_url)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetUrlById :one
SELECT * FROM urls
WHERE id=$1
LIMIT(1);

-- name: GetUrlByShort :one
SELECT * FROM urls
WHERE short_url=$1
LIMIT(1);

-- name: DeleteUrl :exec
DELETE FROM urls
WHERE id=$1;

-- name: UpdateHitCount :exec
UPDATE urls
SET hit_count=hit_count+1
WHERE id=$1;
