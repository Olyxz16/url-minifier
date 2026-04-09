# Quick Start Guide - k6 Load Testing

## TL;DR - Run Tests Now

```bash
# 1. Install k6
brew install k6  # macOS
# or see: https://k6.io/docs/getting-started/installation/

# 2. Start your app
devbox run up

# 3. Get authentication tokens
./k6/scripts/get-tokens.sh

# 4. Run tests
source k6/.env.k6 && k6 run k6/tests/smoke.js    # Quick test (1 min)
source k6/.env.k6 && k6 run k6/tests/load.js     # Full test (16 min)
```

## Or Use the Helper Script

```bash
# Interactive test runner
./k6/scripts/run-test.sh

# Direct test selection
./k6/scripts/run-test.sh smoke
./k6/scripts/run-test.sh load
./k6/scripts/run-test.sh stress
```

## Test Types at a Glance

| Test | Duration | Max Users | Purpose |
|------|----------|-----------|---------|
| **smoke** | 1 min | 1 | Quick validation |
| **load** | 16 min | 50 | Normal traffic |
| **stress** | 33 min | 300 | Find limits |
| **spike** | 16 min | 300 | Sudden bursts |
| **soak** | 70 min | 30 | Long-term stability |

## What Gets Tested

- ✅ URL creation (POST /urls/)
- ✅ URL redirection (GET /urls/{shortUrl})
- ✅ URL info retrieval (GET /urls/info/{id})
- ✅ Health checks (GET /healthz)
- ✅ User authentication (GET /auth/me)

## Expected Performance

Good performance targets:
- Response time p95: < 500ms
- Response time p99: < 1000ms
- Error rate: < 1%
- Check pass rate: > 99%

## Common Issues

**401 Unauthorized**: Run `./k6/scripts/get-tokens.sh` to get fresh tokens

**429 Too Many Requests**: Rate limiting active (30 req/min per IP)

**Connection refused**: Start the server with `devbox run up`

## See Full Documentation

For detailed information, see [k6/README.md](README.md)
