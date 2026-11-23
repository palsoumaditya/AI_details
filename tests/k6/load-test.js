import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

/**
 * AI DETAILS Production-Grade k6 Load Testing Suite
 *
 * Scenarios supported:
 * 1. smoke   — 1-2 VUs, verify endpoint availability
 * 2. load    — Gradual ramp: 10 -> 50 -> 100 rps
 * 3. stress  — High concurrency: 100 -> 250 -> 500 rps
 * 4. spike   — Instantaneous traffic surge to 500 rps
 * 5. soak    — Sustained high traffic to detect memory/connection leaks
 *
 * Configurable Environment Variables:
 * - BASE_URL: Target endpoint (default: http://localhost:3000)
 * - SCENARIO: smoke | load | stress | spike | soak (default: load)
 * - TARGET_RPS: Target request rate ceiling (default: 500)
 */

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const SCENARIO = __ENV.SCENARIO || "load";
const TARGET_RPS = parseInt(__ENV.TARGET_RPS || "500", 10);

// Custom Metrics
export const errorRate = new Rate("error_rate");
export const cacheHitRate = new Rate("cache_hit_rate");
export const p50Trend = new Trend("latency_p50");
export const p95Trend = new Trend("latency_p95");
export const p99Trend = new Trend("latency_p99");
export const successfulRequests = new Counter("successful_requests");

// Representative Read Traffic Distribution
const ENDPOINTS = [
  { path: "/api/v1/models?page=1&limit=20", weight: 30, name: "models_list" },
  { path: "/api/v1/models?q=gpt&limit=20", weight: 15, name: "models_search" },
  { path: "/api/v1/models/gpt-4o", weight: 20, name: "model_detail" },
  { path: "/api/v1/providers?page=1&limit=20", weight: 10, name: "providers_list" },
  { path: "/api/v1/labs?page=1&limit=20", weight: 10, name: "labs_list" },
  { path: "/api/v1/rankings", weight: 5, name: "rankings_directory" },
  { path: "/api/v1/rankings/mmlu_pro", weight: 5, name: "rankings_leaderboard" },
  { path: "/api/v1/compare?models=gpt-4o,claude-3-5-sonnet", weight: 3, name: "compare_models" },
  { path: "/api/v1/health", weight: 2, name: "health_readiness" },
];

function selectEndpoint() {
  const rand = Math.random() * 100;
  let cumulative = 0;
  for (const ep of ENDPOINTS) {
    cumulative += ep.weight;
    if (rand <= cumulative) return ep;
  }
  return ENDPOINTS[0];
}

// Scenarios Configuration
function buildScenarios() {
  if (SCENARIO === "smoke") {
    return {
      smoke_test: {
        executor: "constant-vus",
        vus: 2,
        duration: "15s",
      },
    };
  }

  if (SCENARIO === "stress") {
    return {
      stress_test: {
        executor: "ramping-arrival-rate",
        startRate: 10,
        timeUnit: "1s",
        preAllocatedVUs: 100,
        maxVUs: 1000,
        stages: [
          { target: 50, duration: "30s" },   // Ramp to 50 rps
          { target: 100, duration: "30s" },  // Ramp to 100 rps
          { target: 250, duration: "45s" },  // Ramp to 250 rps
          { target: TARGET_RPS, duration: "1m" }, // Peak at 500 rps
          { target: 10, duration: "15s" },   // Recovery ramp down
        ],
      },
    };
  }

  if (SCENARIO === "spike") {
    return {
      spike_test: {
        executor: "ramping-arrival-rate",
        startRate: 10,
        timeUnit: "1s",
        preAllocatedVUs: 150,
        maxVUs: 1000,
        stages: [
          { target: 10, duration: "10s" },   // Baseline 10 rps
          { target: TARGET_RPS, duration: "10s" }, // Sudden surge to 500 rps!
          { target: TARGET_RPS, duration: "30s" }, // Sustain peak
          { target: 10, duration: "10s" },   // Sharp drop back to normal
        ],
      },
    };
  }

  if (SCENARIO === "soak") {
    return {
      soak_test: {
        executor: "constant-arrival-rate",
        rate: 100,
        timeUnit: "1s",
        duration: "5m",
        preAllocatedVUs: 50,
        maxVUs: 300,
      },
    };
  }

  // Default: Normal load test
  return {
    normal_load: {
      executor: "ramping-arrival-rate",
      startRate: 10,
      timeUnit: "1s",
      preAllocatedVUs: 50,
      maxVUs: 500,
      stages: [
        { target: 50, duration: "30s" },
        { target: 100, duration: "45s" },
        { target: 150, duration: "45s" },
        { target: 10, duration: "15s" },
      ],
    },
  };
}

export const options = {
  scenarios: buildScenarios(),
  thresholds: {
    http_req_failed: ["rate<0.01"],          // Error rate under 1%
    http_req_duration: [
      "p(50)<50",                             // p50 latency under 50ms (served from cache)
      "p(95)<250",                            // p95 latency under 250ms
      "p(99)<600",                            // p99 latency under 600ms
    ],
  },
};

export default function () {
  const endpoint = selectEndpoint();
  const url = `${BASE_URL}${endpoint.path}`;

  const params = {
    headers: {
      "User-Agent": "AI DETAILS-k6-LoadTest/1.0",
      Accept: "application/json",
      "x-load-test-bypass": "benchmark-secret",
    },
    tags: { name: endpoint.name },
  };

  const res = http.get(url, params);

  const isOk = check(res, {
    "status is 200 or 304": (r) => r.status === 200 || r.status === 304,
    "response has body": (r) => r.status === 304 || (r.body && r.body.length > 0),
  });

  if (!isOk) {
    errorRate.add(1);
  } else {
    errorRate.add(0);
    successfulRequests.add(1);
  }

  // Check cache indicators
  const cacheControl = res.headers["Cache-Control"] || "";
  const isCacheable = cacheControl.includes("s-maxage");
  cacheHitRate.add(isCacheable ? 1 : 0);

  p50Trend.add(res.timings.duration);
  p95Trend.add(res.timings.duration);
  p99Trend.add(res.timings.duration);
}
