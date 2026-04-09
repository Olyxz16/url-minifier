// Stress Test
// Pushes the system beyond normal load to find breaking points
// Gradually increases load until system performance degrades

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';
import { BASE_URL, getAuthHeaders, getRandomUrl } from '../config.js';

// Custom metrics
const errorRate = new Rate('errors');
const timeouts = new Counter('timeouts');

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50
    { duration: '2m', target: 100 },  // Ramp up to 100
    { duration: '5m', target: 100 },  // Stay at 100
    { duration: '2m', target: 200 },  // Ramp up to 200
    { duration: '5m', target: 200 },  // Stay at 200
    { duration: '2m', target: 300 },  // Ramp up to 300
    { duration: '5m', target: 300 },  // Stay at 300 - stress zone
    { duration: '5m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'], // Allow up to 5% errors under stress
    http_req_duration: ['p(95)<2000', 'p(99)<5000'], // More lenient under stress
    errors: ['rate<0.1'], // Up to 10% error rate acceptable
  },
};

let shortUrls = [];

export default function () {
  const scenario = Math.random();

  // 70% create URLs, 30% access URLs
  if (scenario < 0.7 && __ENV.ACCESS_TOKEN) {
    // Create URL
    const payload = JSON.stringify({
      redirect_url: getRandomUrl(),
    });

    const res = http.post(
      `${BASE_URL}/urls/`,
      payload,
      { 
        headers: getAuthHeaders(),
        timeout: '10s',
      }
    );

    const success = check(res, {
      'status 201 or 429': (r) => r.status === 201 || r.status === 429, // Accept rate limit
      'not server error': (r) => r.status < 500,
    });

    if (!success) {
      errorRate.add(1);
    } else {
      errorRate.add(0);
    }

    if (res.status === 201) {
      try {
        const body = JSON.parse(res.body);
        shortUrls.push({
          id: body.id,
          short_url: body.short_url,
        });
        
        if (shortUrls.length > 2000) {
          shortUrls = shortUrls.slice(-2000);
        }
      } catch (e) {
        // Ignore parse errors under stress
      }
    }

    if (res.timings.duration > 10000) {
      timeouts.add(1);
    }
  } else if (shortUrls.length > 0) {
    // Access URL
    const randomUrl = shortUrls[Math.floor(Math.random() * shortUrls.length)];
    
    const res = http.get(`${BASE_URL}/urls/${randomUrl.short_url}`, {
      redirects: 0,
      timeout: '10s',
    });

    const success = check(res, {
      'redirect status ok': (r) => r.status === 301 || r.status === 429,
      'not server error': (r) => r.status < 500,
    });

    if (!success) {
      errorRate.add(1);
    } else {
      errorRate.add(0);
    }

    if (res.timings.duration > 10000) {
      timeouts.add(1);
    }
  }

  // Minimal sleep to maintain pressure
  sleep(Math.random() * 0.5);
}

export function handleSummary(data) {
  let summary = '\n=== Stress Test Summary ===\n\n';
  
  summary += `Test Duration: ${(data.state.testRunDurationMs / 1000 / 60).toFixed(1)} minutes\n`;
  summary += `Total Iterations: ${data.metrics.iterations.values.count}\n`;
  summary += `Peak VUs: ${data.metrics.vus_max.values.value}\n\n`;
  
  summary += 'HTTP Performance:\n';
  summary += `  Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `  Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)}/s\n`;
  summary += `  Failed Requests: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n\n`;
  
  summary += 'Response Times:\n';
  summary += `  Avg: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `  Min: ${data.metrics.http_req_duration.values.min.toFixed(2)}ms\n`;
  summary += `  Max: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms\n`;
  summary += `  p50: ${data.metrics.http_req_duration.values['p(50)'].toFixed(2)}ms\n`;
  summary += `  p90: ${data.metrics.http_req_duration.values['p(90)'].toFixed(2)}ms\n`;
  summary += `  p95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `  p99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n\n`;
  
  summary += 'Stress Metrics:\n';
  if (data.metrics.errors) {
    summary += `  Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%\n`;
  }
  if (data.metrics.timeouts) {
    summary += `  Timeouts: ${data.metrics.timeouts.values.count}\n`;
  }
  
  summary += '\nChecks:\n';
  summary += `  Passed: ${data.metrics.checks.values.passes}\n`;
  summary += `  Failed: ${data.metrics.checks.values.fails}\n`;
  const passRate = (data.metrics.checks.values.passes / (data.metrics.checks.values.passes + data.metrics.checks.values.fails) * 100).toFixed(2);
  summary += `  Pass Rate: ${passRate}%\n`;
  
  summary += '\n=== Analysis ===\n';
  summary += 'Check the metrics above to identify:\n';
  summary += '- At what user count does performance degrade?\n';
  summary += '- What is the maximum sustainable load?\n';
  summary += '- Are there any bottlenecks (DB, Redis, CPU)?\n';
  
  return { stdout: summary };
}
