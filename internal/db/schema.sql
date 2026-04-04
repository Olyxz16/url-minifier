CREATE TABLE users (
    id         UUID        PRIMARY KEY,
    email      TEXT        NOT NULL UNIQUE,
    provider   TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE urls (
    id           UUID        PRIMARY KEY,
    creator_id   UUID        REFERENCES users(id),
    short_url    TEXT        NOT NULL UNIQUE,
    redirect_url TEXT        NOT NULL UNIQUE,
    hit_count    INT         NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at   TIMESTAMPTZ
);

CREATE INDEX id_urls_short_url ON urls (short_url);
