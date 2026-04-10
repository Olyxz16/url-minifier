FROM golang:1.26.1-alpine AS build

WORKDIR /app

RUN apk update
RUN apk add --no-cache git ca-certificates tzdata && update-ca-certificates

RUN adduser --disabled-password --gecos "" --home "/nonexistent" \
    --shell "/sbin/nologin" --no-create-home --uid 10001 appuser

COPY go.mod go.sum .

RUN go mod download
RUN go mod verify

COPY cmd/ ./cmd/
COPY internal ./internal/

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags='-w -s -extldflags "-static"' -a -o /build/api cmd/api/main.go


FROM scratch

WORKDIR /app

LABEL org.opencontainers.image.source=https://github.com/Olyxz16/go-chi-oauth-psql

ENV SSL_CERT_FILE=/certs/ca-certificates.crt
ENV PORT=8080
EXPOSE 8080

COPY --from=build /etc/ssl/certs/ca-certificates.crt /certs
COPY --from=build /etc/passwd /etc/passwd
COPY --from=build /etc/group /etc/group

COPY --from=build --chown=appuser:appuser /build/api ./api

USER appuser:appuser

ENTRYPOINT ["/app/api"]
