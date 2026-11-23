import autocannon from "autocannon";
import http from "node:http";

/**
 * Automated High-Concurrency Benchmark Runner
 *
 * Runs progressive load tests against specified endpoints,
 * recording requests/second, p50, p95, p99 latencies, and error rates.
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const DURATION = parseInt(process.env.BENCH_DURATION || "10", 10);

interface BenchmarkScenario {
  name: string;
  path: string;
  connections: number;
  pipelining: number;
}

const SCENARIOS: BenchmarkScenario[] = [
  {
    name: "1. Health Endpoint (Liveness/Readiness)",
    path: "/api/v1/health",
    connections: 50,
    pipelining: 1,
  },
  {
    name: "2. Models Catalog Discovery (/api/v1/models)",
    path: "/api/v1/models?page=1&limit=20",
    connections: 50,
    pipelining: 1,
  },
  {
    name: "3. Filtered Model Search (/api/v1/models?q=gpt)",
    path: "/api/v1/models?q=gpt&limit=20",
    connections: 50,
    pipelining: 1,
  },
  {
    name: "4. Provider Directory (/api/v1/providers)",
    path: "/api/v1/providers?page=1&limit=20",
    connections: 50,
    pipelining: 1,
  },
  {
    name: "5. AI Lab Directory (/api/v1/labs)",
    path: "/api/v1/labs?page=1&limit=20",
    connections: 50,
    pipelining: 1,
  },
  {
    name: "6. Rankings & Leaderboards (/api/v1/rankings)",
    path: "/api/v1/rankings",
    connections: 50,
    pipelining: 1,
  },
];

async function runScenario(scenario: BenchmarkScenario): Promise<void> {
  console.log(`\n===============================================================`);
  console.log(`🚀 RUNNING BENCHMARK: ${scenario.name}`);
  console.log(`   URL: ${BASE_URL}${scenario.path}`);
  console.log(`   Concurrency: ${scenario.connections} connections | Duration: ${DURATION}s`);
  console.log(`===============================================================`);

  return new Promise((resolve) => {
    const instance = autocannon(
      {
        url: `${BASE_URL}${scenario.path}`,
        connections: scenario.connections,
        pipelining: scenario.pipelining,
        duration: DURATION,
        headers: {
          accept: "application/json",
          "user-agent": "AI DETAILS-Benchmark-Runner/1.0",
        },
      },
      (err, result) => {
        if (err) {
          console.error(`❌ Benchmark error:`, err);
          resolve();
          return;
        }

        console.log(`📊 BENCHMARK RESULTS:`);
        console.log(`   Throughput:        ${result.requests.average.toFixed(1)} req/sec`);
        console.log(`   Total Requests:    ${result.requests.total}`);
        console.log(`   Total Duration:    ${result.duration}s`);
        console.log(`   Latency p50 (Med): ${result.latency.p50} ms`);
        console.log(`   Latency p95:       ${result.latency.p95} ms`);
        console.log(`   Latency p99:       ${result.latency.p99} ms`);
        console.log(`   Non-2xx / Errors:  ${result.non2xx + result.errors}`);
        console.log(`   Error Rate:        ${((result.non2xx + result.errors) / (result.requests.total || 1) * 100).toFixed(2)}%`);
        console.log(`   Data Transferred:  ${(result.throughput.total / 1024 / 1024).toFixed(2)} MB`);

        resolve();
      }
    );

    autocannon.track(instance, { renderProgressBar: true });
  });
}

async function main() {
  console.log(`\n===============================================================`);
  console.log(`   AI DETAILS PRODUCTION HIGH-CONCURRENCY LOAD BENCHMARK`);
  console.log(`===============================================================`);
  console.log(`Testing target: ${BASE_URL}`);

  // Test target connectivity first
  try {
    const res = await fetch(`${BASE_URL}/api/v1/health`);
    if (!res.ok) {
      console.warn(`Target responded with status ${res.status}`);
    } else {
      console.log(`Target connectivity confirmed. Starting scenarios...`);
    }
  } catch (connErr) {
    console.error(`❌ Cannot connect to ${BASE_URL}:`, (connErr as Error).message);
    console.log(`Ensure the Next.js application server is running on ${BASE_URL}.`);
    process.exit(1);
  }

  for (const scenario of SCENARIOS) {
    await runScenario(scenario);
  }

  console.log(`\n===============================================================`);
  console.log(`   ALL BENCHMARK SCENARIOS COMPLETED`);
  console.log(`===============================================================\n`);
}

main().catch(console.error);
