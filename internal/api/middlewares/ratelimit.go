package middlewares

import (
    "net/http"

    "github.com/go-redis/redis_rate/v10"
)

func RateLimitMiddleware(limiter *redis_rate.Limiter, rpm int) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            ip := r.Header.Get("X-Forwarded-For")
            if ip == "" {
                ip = r.RemoteAddr
            }

            res, err := limiter.Allow(r.Context(), "auth:"+ip, redis_rate.PerMinute(rpm))
            if err != nil {
                http.Error(w, "Internal server error", http.StatusInternalServerError)
                return
            }
            if res.Remaining == 0 {
                http.Error(w, "Too many requests", http.StatusTooManyRequests)
                return
            }

            next.ServeHTTP(w, r)
        })
    }
}
