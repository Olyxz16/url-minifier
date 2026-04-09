# k6 Load Testing for URL Minifier

This directory contains k6 performance tests for the URL Minifier application. The test suite includes various testing scenarios to evaluate system performance, reliability, and scalability.

## Prerequisites

1. **Install k6**: https://k6.io/docs/getting-started/installation/
   ```bash
   # macOS
   brew install k6
   
   # Linux
   sudo gpg -k
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update
   sudo apt-get install k6
   
   # Windows
   choco install k6
   ```

2. **Start the application**:
   ```bash
   # From the project root
   devbox run up
   ```

3. **Obtain authentication tokens** (for authenticated endpoints):
   ```bash
   # Use the helper script
   ./k6/scripts/get-tokens.sh
   
   # Or manually through the OAuth flow and CLI
   ```

## Test Scenarios

### 1. Smoke Test (`tests/smoke.js`)
**Purpose**: Quick validation that the system works under minimal load

**Duration**: ~1 minute  
**VUs**: 1  
**When to run**: Before any other tests, after deployments, or code changes

```bash
k6 run k6/tests/smoke.js
```

**What it tests**:
- Health check endpoint
- URL creation (if token provided)
- URL redirection
- User authentication

**Success criteria**:
- All endpoints return expected status codes
- Response times are reasonable
- No errors

---

### 2. Load Test (`tests/load.js`)
**Purpose**: Validate system performance under expected normal load

**Duration**: ~16 minutes  
**Peak VUs**: 50  
**When to run**: Regular performance validation, before releases

```bash
k6 run k6/tests/load.js \
  -e BASE_URL=http://localhost:8080 \
  -e ACCESS_TOKEN=your_token_here
```

**Load profile**:
- Ramp up to 20 users over 2 minutes
- Maintain 20 users for 5 minutes
- Ramp up to 50 users over 2 minutes
- Maintain 50 users for 5 minutes
- Ramp down to 0 over 2 minutes

**Traffic distribution**:
- 60% URL creation (authenticated)
- 30% URL redirection (public)
- 10% URL info retrieval (authenticated)

**Success criteria**:
- < 1% error rate
- p95 response time < 500ms
- p99 response time < 1000ms

---

### 3. Stress Test (`tests/stress.js`)
**Purpose**: Find the breaking point of the system

**Duration**: ~33 minutes  
**Peak VUs**: 300  
**When to run**: Capacity planning, infrastructure changes

```bash
k6 run k6/tests/stress.js \
  -e BASE_URL=http://localhost:8080 \
  -e ACCESS_TOKEN=your_token_here
```

**Load profile**:
- Gradually ramp up to 300 users
- Stages: 50 → 100 → 200 → 300 users
- Maintain each level for 5 minutes

**What to monitor**:
- At what user count does performance degrade?
- Database connection pool usage
- Redis connection usage
- CPU and memory usage
- Error rates and types

**Success criteria** (more lenient):
- < 5% error rate
- p95 response time < 2000ms
- System remains stable (no crashes)

---

### 4. Spike Test (`tests/spike.js`)
**Purpose**: Test system behavior under sudden traffic spikes

**Duration**: ~16 minutes  
**Peak VUs**: 300  
**When to run**: Before major events, marketing campaigns

```bash
k6 run k6/tests/spike.js \
  -e BASE_URL=http://localhost:8080 \
  -e ACCESS_TOKEN=your_token_here
```

**Load profile**:
- Normal load (10 users)
- Sudden spike to 200 users in 10 seconds
- Maintain for 3 minutes
- Drop back to 10 users
- Second spike to 300 users
- Ramp down

**What to observe**:
- Does the system handle sudden load gracefully?
- How long does recovery take?
- Are errors isolated to spike periods?
- Does rate limiting activate appropriately?

---

### 5. Soak Test (`tests/soak.js`)
**Purpose**: Test system stability over extended periods

**Duration**: ~1 hour 10 minutes  
**VUs**: 30 (constant)  
**When to run**: Before major releases, after infrastructure changes

```bash
k6 run k6/tests/soak.js \
  -e BASE_URL=http://localhost:8080 \
  -e ACCESS_TOKEN=your_token_here
```

**What to monitor**:
- Memory leaks (check server memory over time)
- Connection pool exhaustion
- Gradual performance degradation
- Disk usage (logs, database)
- Database query performance

**Success criteria**:
- Stable response times throughout
- No memory growth
- < 1% error rate maintained

---

## Running Tests

### Basic Usage

```bash
# Run a test with default settings
k6 run k6/tests/smoke.js

# Run with environment variables
k6 run k6/tests/load.js \
  -e BASE_URL=http://localhost:8080 \
  -e ACCESS_TOKEN=your_access_token
```

### With Authentication

Most tests require authentication. Set the `ACCESS_TOKEN` environment variable:

```bash
# Export token
export ACCESS_TOKEN="v2.local.your-token-here"

# Run test
k6 run k6/tests/load.js -e ACCESS_TOKEN=$ACCESS_TOKEN
```

### Output Options

```bash
# JSON output
k6 run k6/tests/load.js --out json=results.json

# CSV output
k6 run k6/tests/load.js --out csv=results.csv

# Cloud output (requires k6 Cloud account)
k6 run k6/tests/load.js --out cloud

# InfluxDB output
k6 run k6/tests/load.js --out influxdb=http://localhost:8086/k6
```

### Custom Configuration

```bash
# Override VUs and duration
k6 run k6/tests/load.js --vus 10 --duration 30s

# Set custom thresholds
k6 run k6/tests/load.js --summary-trend-stats="avg,min,med,max,p(90),p(95),p(99)"
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BASE_URL` | API base URL | `http://localhost:8080` |
| `ACCESS_TOKEN` | PASETO access token for authenticated endpoints | (empty) |
| `REFRESH_TOKEN` | PASETO refresh token | (empty) |

---

## Getting Authentication Tokens

### Option 1: Helper Script
```bash
./k6/scripts/get-tokens.sh
```

### Option 2: Manual OAuth Flow

1. Start the application
2. Visit `http://localhost:8080/auth/` in a browser
3. Complete Google OAuth flow
4. Extract tokens from the response or session

### Option 3: CLI Authentication (if available)

Check your application's CLI documentation for direct token generation.

---

## Interpreting Results

### Key Metrics

- **http_req_duration**: Total request time (sending + waiting + receiving)
- **http_req_waiting**: Time to first byte (TTFB)
- **http_req_failed**: Percentage of failed requests
- **iterations**: Number of complete test iterations
- **vus**: Virtual users (concurrent connections)

### Response Time Guidelines

- **Excellent**: p95 < 200ms
- **Good**: p95 < 500ms
- **Acceptable**: p95 < 1000ms
- **Poor**: p95 > 1000ms

### Error Rate Guidelines

- **Production**: < 0.1% (1 in 1000)
- **Acceptable**: < 1% (1 in 100)
- **Poor**: > 5%

---

## Recommended Testing Workflow

1. **Smoke Test** - Verify basic functionality
   ```bash
   k6 run k6/tests/smoke.js -e ACCESS_TOKEN=$ACCESS_TOKEN
   ```

2. **Load Test** - Validate normal performance
   ```bash
   k6 run k6/tests/load.js -e ACCESS_TOKEN=$ACCESS_TOKEN
   ```

3. **Stress Test** - Find limits (optional)
   ```bash
   k6 run k6/tests/stress.js -e ACCESS_TOKEN=$ACCESS_TOKEN
   ```

4. **Spike Test** - Validate resilience (optional)
   ```bash
   k6 run k6/tests/spike.js -e ACCESS_TOKEN=$ACCESS_TOKEN
   ```

5. **Soak Test** - Long-term stability (pre-release)
   ```bash
   k6 run k6/tests/soak.js -e ACCESS_TOKEN=$ACCESS_TOKEN
   ```

---

## Important Notes

### Rate Limiting

The application has rate limiting (30 requests/minute per IP). For testing:

- Tests may hit rate limits at high VU counts
- Rate limit responses (429) are tracked separately
- Consider temporarily disabling rate limiting for stress tests
- Or configure tests to use multiple source IPs

### Database Cleanup

The application has unique constraints on `redirect_url`. Between test runs:

```bash
# Clean up test URLs if needed
psql -h localhost -U postgres -d app -c "DELETE FROM urls WHERE redirect_url LIKE 'https://example.com%';"
```

### Monitoring During Tests

Monitor these while tests run:

```bash
# Database connections
psql -h localhost -U postgres -d app -c "SELECT count(*) FROM pg_stat_activity;"

# Application logs
docker logs -f url-minifier-api

# System resources
htop
```

### Test Data

- Tests generate random URLs with `https://example.com/...` and other domains
- Short URLs are stored in memory during test execution
- Redirects increment hit counts asynchronously

---

## Troubleshooting

### "Connection refused"
- Ensure the application is running: `devbox run up`
- Check BASE_URL is correct

### "401 Unauthorized"
- Set ACCESS_TOKEN environment variable
- Ensure token hasn't expired
- Generate new token if needed

### "429 Too Many Requests"
- Rate limiting is active
- Reduce VUs or request rate
- Consider disabling rate limiting for tests

### High error rates
- Check application logs for errors
- Verify database and Redis are running
- Ensure sufficient system resources

### Slow tests
- Check database performance
- Monitor Redis latency
- Review server resource usage (CPU, memory, I/O)

---

## CI/CD Integration

### Example GitHub Actions

```yaml
name: Performance Tests

on:
  pull_request:
    branches: [main]

jobs:
  k6-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Start services
        run: docker-compose up -d
      
      - name: Install k6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      
      - name: Run smoke test
        run: k6 run k6/tests/smoke.js
      
      - name: Run load test
        run: k6 run k6/tests/load.js -e ACCESS_TOKEN=${{ secrets.K6_ACCESS_TOKEN }}
```

---

## Additional Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Best Practices](https://k6.io/docs/testing-guides/test-types/)
- [Grafana k6 Cloud](https://k6.io/cloud/)
- [Performance Testing Metrics](https://k6.io/docs/using-k6/metrics/)

---

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Add appropriate thresholds
3. Include clear comments
4. Update this README
5. Test locally before committing
