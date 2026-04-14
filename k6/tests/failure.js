// Load Test
// Tests the system's performance under expected normal load
// Gradually ramps up users and maintains steady load

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { BASE_URL, getAuthHeaders, getRandomUrl } from '../config.js';

// Custom metrics
const errorRate = new Rate('errors');
const createUrlRate = new Rate('create_url_success');
const redirectRate = new Rate('redirect_success');

export const options = {
  scenarios: {
    ramp_to_failure: {
      executor: 'ramping-arrival-rate',
      startRate: 1000,
      timeUnit: '1s',
      preAllocatedVUs: 500,
      maxVUs: 50000,
      stages: [
        { target: 10000,  duration: '2m' },   // ramp
        { target: 50000,  duration: '5m' },   // stress
        { target: 100000, duration: '5m' },   // push to failure
        { target: 0,      duration: '2m' },   // cool down
      ],
    },
  },
  thresholds: {
    http_req_failed: [{ threshold: 'rate<0.01', abortOnFail: true }],
    http_req_duration: ['p(95)<500'],
  },
};

// Shared array to store created short URLs
let shortUrls = [];

export default function () {
  const scenario = Math.random();

  // 60% of traffic: Create new short URLs
  if (scenario < 0.6 && __ENV.ACCESS_TOKEN) {
    const payload = JSON.stringify({
      redirect_url: getRandomUrl(),
    });

    const res = http.post(
      `${BASE_URL}/urls/`,
      payload,
      { headers: getAuthHeaders() }
    );

    const success = check(res, {
      'create URL: status 201': (r) => r.status === 201,
      'create URL: has short_url': (r) => {
        try {
          return JSON.parse(r.body).short_url !== undefined;
        } catch {
          return false;
        }
      },
    });

    createUrlRate.add(success);
    errorRate.add(!success);

    if (success && res.status === 201) {
      try {
        const body = JSON.parse(res.body);
        shortUrls.push({
          id: body.id,
          short_url: body.short_url,
        });
        
        // Keep array size manageable
        if (shortUrls.length > 1000) {
          shortUrls = shortUrls.slice(-1000);
        }
      } catch (e) {
        console.error('Failed to parse response:', e);
      }
    }
  }
  // 30% of traffic: Access short URLs (redirects)
  else if (scenario < 0.9 && shortUrls.length > 0) {
    const randomUrl = shortUrls[Math.floor(Math.random() * shortUrls.length)];
    
    const res = http.get(`${BASE_URL}/urls/${randomUrl.short_url}`, {
      redirects: 0,
    });

    const success = check(res, {
      'redirect: status 301': (r) => r.status === 301,
      'redirect: has Location': (r) => r.headers['Location'] !== undefined,
    });

    redirectRate.add(success);
    errorRate.add(!success);
  }
  // 10% of traffic: Get URL info
  else if (shortUrls.length > 0 && __ENV.ACCESS_TOKEN) {
    const randomUrl = shortUrls[Math.floor(Math.random() * shortUrls.length)];
    
    const res = http.get(
      `${BASE_URL}/urls/info/${randomUrl.id}`,
      { headers: getAuthHeaders() }
    );

    const success = check(res, {
      'info: status 200': (r) => r.status === 200,
      'info: has hit_count': (r) => {
        try {
          return JSON.parse(r.body).hit_count !== undefined;
        } catch {
          return false;
        }
      },
    });

    errorRate.add(!success);
  }

}

export function handleSummary(data) {
  const summary = {
    stdout: textSummary(data),
  };
  
  return summary;
}

function textSummary(data) {
  let summary = '\n=== Load Test Summary ===\n\n';
  
  summary += `Test Duration: ${(data.state.testRunDurationMs / 1000).toFixed(0)}s\n`;
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
  summary += `  p95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `  p99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n\n`;
  
  summary += 'Custom Metrics:\n';
  if (data.metrics.errors) {
    summary += `  Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%\n`;
  }
  if (data.metrics.create_url_success) {
    summary += `  Create URL Success: ${(data.metrics.create_url_success.values.rate * 100).toFixed(2)}%\n`;
  }
  if (data.metrics.redirect_success) {
    summary += `  Redirect Success: ${(data.metrics.redirect_success.values.rate * 100).toFixed(2)}%\n`;
  }
  
  summary += '\nChecks:\n';
  summary += `  Passed: ${data.metrics.checks.values.passes}\n`;
  summary += `  Failed: ${data.metrics.checks.values.fails}\n`;
  summary += `  Pass Rate: ${(data.metrics.checks.values.passes / (data.metrics.checks.values.passes + data.metrics.checks.values.fails) * 100).toFixed(2)}%\n`;
  
  return summary;
}
