// k6 Configuration
// Base configuration for all k6 tests

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

// Auth tokens - set via environment variables
export const ACCESS_TOKEN = __ENV.ACCESS_TOKEN || '';
export const REFRESH_TOKEN = __ENV.REFRESH_TOKEN || '';

// Test configuration
export const config = {
  // Thresholds define success criteria
  thresholds: {
    http_req_failed: ['rate<0.01'], // http errors should be less than 1%
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests under 500ms, 99% under 1s
    http_req_waiting: ['p(95)<400'], // time to first byte
  },
  
  // Common scenarios for reuse
  stages: {
    warmup: { duration: '30s', target: 10 },
    rampup: { duration: '1m', target: 50 },
    steady: { duration: '3m', target: 50 },
    rampdown: { duration: '30s', target: 0 },
  }
};

// Helper function to get auth headers
export function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ACCESS_TOKEN}`,
  };
}

// Helper function to get basic headers
export function getHeaders() {
  return {
    'Content-Type': 'application/json',
  };
}

// Sample URLs for testing
export const TEST_URLS = [
  'https://example.com/page1',
  'https://github.com/user/repo',
  'https://stackoverflow.com/questions/12345',
  'https://medium.com/article/title',
  'https://reddit.com/r/programming',
  'https://dev.to/article',
  'https://twitter.com/user/status',
  'https://youtube.com/watch?v=abc123',
  'https://docs.google.com/document/d/abc',
  'https://amazon.com/product/dp/abc',
];

// Get a random URL from the list
export function getRandomUrl() {
  return TEST_URLS[Math.floor(Math.random() * TEST_URLS.length)] + '/' + Math.random().toString(36).substring(7);
}
