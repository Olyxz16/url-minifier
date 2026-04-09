// Spike Test
// Tests how the system handles sudden large spikes in traffic
// Useful for identifying issues with auto-scaling, rate limiting, and circuit breakers

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';
import { BASE_URL, getAuthHeaders, getRandomUrl } from '../config.js';

const errorRate = new Rate('errors');
const rateLimited = new Counter('rate_limited');

export const options = {
  stages: [
    { duration: '1m', target: 10 },    // Start with normal load
    { duration: '10s', target: 200 },  // Sudden spike to 200 users
    { duration: '3m', target: 200 },   // Maintain spike
    { duration: '10s', target: 10 },   // Drop back to normal
    { duration: '2m', target: 10 },    // Recover
    { duration: '10s', target: 300 },  // Even bigger spike
    { duration: '3m', target: 300 },   // Maintain bigger spike
    { duration: '1m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_failed: ['rate<0.1'], // Up to 10% errors during spike acceptable
    http_req_duration: ['p(95)<3000'], // 95% under 3s
    errors: ['rate<0.15'], // Up to 15% error rate
  },
};

let shortUrls = [];

export default function () {
  const scenario = Math.random();

  if (scenario < 0.6 && __ENV.ACCESS_TOKEN) {
    // Create URL - 60% of requests
    const payload = JSON.stringify({
      redirect_url: getRandomUrl(),
    });

    const res = http.post(
      `${BASE_URL}/urls/`,
      payload,
      { 
        headers: getAuthHeaders(),
        timeout: '15s',
      }
    );

    const success = check(res, {
      'create: status ok': (r) => r.status === 201,
      'create: not server error': (r) => r.status < 500,
    });

    if (res.status === 429) {
      rateLimited.add(1);
    }

    errorRate.add(!success);

    if (res.status === 201) {
      try {
        const body = JSON.parse(res.body);
        shortUrls.push({
          id: body.id,
          short_url: body.short_url,
        });
        
        if (shortUrls.length > 3000) {
          shortUrls = shortUrls.slice(-3000);
        }
      } catch (e) {
        // Ignore
      }
    }
  } else if (shortUrls.length > 0) {
    // Access URL - 40% of requests
    const randomUrl = shortUrls[Math.floor(Math.random() * shortUrls.length)];
    
    const res = http.get(`${BASE_URL}/urls/${randomUrl.short_url}`, {
      redirects: 0,
      timeout: '15s',
    });

    const success = check(res, {
      'redirect: status 301': (r) => r.status === 301,
      'redirect: not server error': (r) => r.status < 500,
    });

    if (res.status === 429) {
      rateLimited.add(1);
    }

    errorRate.add(!success);
  }

  // Very minimal sleep during spike
  sleep(Math.random() * 0.3);
}

export function handleSummary(data) {
  let summary = '\n=== Spike Test Summary ===\n\n';
  
  summary += `Test Duration: ${(data.state.testRunDurationMs / 1000 / 60).toFixed(1)} minutes\n`;
  summary += `Total Iterations: ${data.metrics.iterations.values.count}\n`;
  summary += `Peak VUs: ${data.metrics.vus_max.values.value}\n\n`;
  
  summary += 'HTTP Performance:\n';
  summary += `  Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `  Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)}/s\n`;
  summary += `  Failed Requests: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n\n`;
  
  summary += 'Response Times:\n';
  summary += `  Avg: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `  p50: ${data.metrics.http_req_duration.values['p(50)'].toFixed(2)}ms\n`;
  summary += `  p95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `  p99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n`;
  summary += `  Max: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms\n\n`;
  
  summary += 'Spike Analysis:\n';
  if (data.metrics.errors) {
    summary += `  Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%\n`;
  }
  if (data.metrics.rate_limited) {
    summary += `  Rate Limited Requests: ${data.metrics.rate_limited.values.count}\n`;
  }
  
  summary += '\nChecks:\n';
  summary += `  Passed: ${data.metrics.checks.values.passes}\n`;
  summary += `  Failed: ${data.metrics.checks.values.fails}\n`;
  const passRate = (data.metrics.checks.values.passes / (data.metrics.checks.values.passes + data.metrics.checks.values.fails) * 100).toFixed(2);
  summary += `  Pass Rate: ${passRate}%\n`;
  
  summary += '\n=== Key Questions ===\n';
  summary += '- Did the system handle the sudden spike gracefully?\n';
  summary += '- How long did it take to recover after the spike?\n';
  summary += '- Were errors isolated to the spike period?\n';
  summary += '- Did rate limiting kick in appropriately?\n';
  
  return { stdout: summary };
}
