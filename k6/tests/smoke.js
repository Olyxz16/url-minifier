// Smoke Test
// Quick test to verify that the system works under minimal load
// Run this before any other tests to validate basic functionality

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, getAuthHeaders, getHeaders, getRandomUrl } from '../config.js';

export const options = {
  vus: 1, // 1 virtual user
  duration: '1m', // run for 1 minute
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
  },
};

let createdShortUrls = [];

export default function () {
  // Test 1: Health check
  const healthRes = http.get(`${BASE_URL}/healthz`);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
  });

  sleep(1);

  // Test 2: Create a short URL (requires auth)
  if (__ENV.ACCESS_TOKEN) {
    const createPayload = JSON.stringify({
      redirect_url: getRandomUrl(),
    });

    const createRes = http.post(
      `${BASE_URL}/urls/`,
      createPayload,
      { headers: getAuthHeaders() }
    );

    const createSuccess = check(createRes, {
      'create URL status is 201': (r) => r.status === 201,
      'create URL returns short_url': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.short_url !== undefined;
        } catch {
          return false;
        }
      },
    });

    if (createSuccess && createRes.status === 201) {
      const body = JSON.parse(createRes.body);
      createdShortUrls.push(body.short_url);
    }

    sleep(1);
  }

  // Test 3: Access a short URL (public endpoint)
  if (createdShortUrls.length > 0) {
    const shortUrl = createdShortUrls[Math.floor(Math.random() * createdShortUrls.length)];
    const redirectRes = http.get(`${BASE_URL}/urls/${shortUrl}`, {
      redirects: 0, // Don't follow redirects
    });

    check(redirectRes, {
      'redirect status is 301': (r) => r.status === 301,
      'redirect has Location header': (r) => r.headers['Location'] !== undefined,
    });

    sleep(1);
  }

  // Test 4: Get user info (requires auth)
  if (__ENV.ACCESS_TOKEN) {
    const meRes = http.get(`${BASE_URL}/auth/me`, {
      headers: getAuthHeaders(),
    });

    check(meRes, {
      'auth/me status is 200': (r) => r.status === 200,
      'auth/me returns email': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.email !== undefined;
        } catch {
          return false;
        }
      },
    });

    sleep(1);
  }
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options?.indent || '';
  const enableColors = options?.enableColors || false;
  
  let summary = '\n' + indent + '=== Smoke Test Summary ===\n\n';
  
  summary += indent + `Duration: ${data.state.testRunDurationMs / 1000}s\n`;
  summary += indent + `Iterations: ${data.metrics.iterations.values.count}\n`;
  summary += indent + `VUs: ${data.metrics.vus.values.value}\n\n`;
  
  summary += indent + 'HTTP Metrics:\n';
  summary += indent + `  Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += indent + `  Failed: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n`;
  summary += indent + `  Duration (p95): ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += indent + `  Duration (p99): ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n\n`;
  
  summary += indent + 'Checks:\n';
  summary += indent + `  Passed: ${data.metrics.checks.values.passes}\n`;
  summary += indent + `  Failed: ${data.metrics.checks.values.fails}\n`;
  
  return summary;
}
