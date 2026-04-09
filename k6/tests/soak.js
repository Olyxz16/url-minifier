// Soak Test (Endurance Test)
// Tests system stability and reliability over an extended period
// Identifies memory leaks, resource exhaustion, and gradual degradation

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL, getAuthHeaders, getRandomUrl } from '../config.js';

const errorRate = new Rate('errors');
const createLatency = new Trend('create_url_latency');
const redirectLatency = new Trend('redirect_latency');

export const options = {
  stages: [
    { duration: '5m', target: 30 },    // Ramp up to moderate load
    { duration: '1h', target: 30 },    // Maintain for 1 hour
    { duration: '5m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'], // Less than 1% errors over time
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // Performance should remain consistent
    errors: ['rate<0.02'], // Error rate should stay low
    // Ensure latency doesn't degrade over time
    create_url_latency: ['p(95)<600', 'p(99)<1200'],
    redirect_latency: ['p(95)<400', 'p(99)<800'],
  },
};

let shortUrls = [];
let iterations = 0;

export default function () {
  iterations++;
  const scenario = Math.random();

  // 50% create, 50% access - balanced workload
  if (scenario < 0.5 && __ENV.ACCESS_TOKEN) {
    const payload = JSON.stringify({
      redirect_url: getRandomUrl(),
    });

    const startTime = Date.now();
    const res = http.post(
      `${BASE_URL}/urls/`,
      payload,
      { headers: getAuthHeaders() }
    );
    createLatency.add(Date.now() - startTime);

    const success = check(res, {
      'create: status 201': (r) => r.status === 201,
      'create: has response': (r) => r.body && r.body.length > 0,
    });

    errorRate.add(!success);

    if (res.status === 201) {
      try {
        const body = JSON.parse(res.body);
        shortUrls.push({
          id: body.id,
          short_url: body.short_url,
        });
        
        // Keep a larger pool for long-running test
        if (shortUrls.length > 5000) {
          shortUrls = shortUrls.slice(-5000);
        }
      } catch (e) {
        console.error('Parse error:', e);
      }
    }
  } else if (shortUrls.length > 0) {
    const randomUrl = shortUrls[Math.floor(Math.random() * shortUrls.length)];
    
    const startTime = Date.now();
    const res = http.get(`${BASE_URL}/urls/${randomUrl.short_url}`, {
      redirects: 0,
    });
    redirectLatency.add(Date.now() - startTime);

    const success = check(res, {
      'redirect: status 301': (r) => r.status === 301,
      'redirect: has Location': (r) => r.headers['Location'] !== undefined,
    });

    errorRate.add(!success);
  }

  // Occasional health check to monitor system status
  if (iterations % 100 === 0) {
    const healthRes = http.get(`${BASE_URL}/healthz`);
    check(healthRes, {
      'health check ok': (r) => r.status === 200,
    });
  }

  // Realistic user think time
  sleep(Math.random() * 3 + 1); // 1-4 seconds
}

export function handleSummary(data) {
  let summary = '\n=== Soak Test Summary (Endurance) ===\n\n';
  
  const durationMinutes = (data.state.testRunDurationMs / 1000 / 60).toFixed(1);
  summary += `Test Duration: ${durationMinutes} minutes\n`;
  summary += `Total Iterations: ${data.metrics.iterations.values.count}\n`;
  summary += `Avg VUs: ${data.metrics.vus.values.value}\n\n`;
  
  summary += 'HTTP Performance:\n';
  summary += `  Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `  Avg Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)}/s\n`;
  summary += `  Failed Requests: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n\n`;
  
  summary += 'Response Times (Overall):\n';
  summary += `  Avg: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `  p50: ${data.metrics.http_req_duration.values['p(50)'].toFixed(2)}ms\n`;
  summary += `  p95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `  p99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n\n`;
  
  if (data.metrics.create_url_latency) {
    summary += 'Create URL Latency:\n';
    summary += `  Avg: ${data.metrics.create_url_latency.values.avg.toFixed(2)}ms\n`;
    summary += `  p95: ${data.metrics.create_url_latency.values['p(95)'].toFixed(2)}ms\n`;
    summary += `  p99: ${data.metrics.create_url_latency.values['p(99)'].toFixed(2)}ms\n\n`;
  }
  
  if (data.metrics.redirect_latency) {
    summary += 'Redirect Latency:\n';
    summary += `  Avg: ${data.metrics.redirect_latency.values.avg.toFixed(2)}ms\n`;
    summary += `  p95: ${data.metrics.redirect_latency.values['p(95)'].toFixed(2)}ms\n`;
    summary += `  p99: ${data.metrics.redirect_latency.values['p(99)'].toFixed(2)}ms\n\n`;
  }
  
  summary += 'Reliability:\n';
  if (data.metrics.errors) {
    summary += `  Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%\n`;
  }
  summary += `  Check Pass Rate: ${(data.metrics.checks.values.passes / (data.metrics.checks.values.passes + data.metrics.checks.values.fails) * 100).toFixed(2)}%\n\n`;
  
  summary += '=== Endurance Analysis ===\n';
  summary += 'Monitor for signs of:\n';
  summary += '- Memory leaks (check server memory usage over time)\n';
  summary += '- Connection pool exhaustion (DB, Redis)\n';
  summary += '- Gradual performance degradation\n';
  summary += '- Resource cleanup issues\n';
  summary += '- Log file growth and disk usage\n\n';
  
  summary += 'If response times remained stable and error rates stayed low,\n';
  summary += 'the system demonstrates good endurance characteristics.\n';
  
  return { stdout: summary };
}
