import { spawn, ChildProcess } from "node:child_process";
import autocannon from "autocannon";
import path from "node:path";

const PORT = 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const DURATION = 10; // 10 seconds per scenario for thorough statistical stability

interface Scenario {
  name: string;
  path: string;
  connections: number;
}

const SCENARIOS: Scenario[] = [
  {
    name: "System Health & Observability Probe",
    path: "/api/v1/health",
    connections: 50,
  },
  {
    name: "Model Catalog Discovery (Default Page 1)",
    path: "/api/v1/models?page=1&limit=20",
    connections: 50,
  },
  {
    name: "Model Filtered Full-Text Search (?q=gpt)",
    path: "/api/v1/models?q=gpt&limit=20",
    connections: 50,
  },
  {
    name: "Inference Provider Directory",
    path: "/api/v1/providers?page=1&limit=20",
    connections: 50,
  },
  {
    name: "AI Research Lab Directory",
    path: "/api/v1/labs?page=1&limit=20",
    connections: 50,
  },
  {
    name: "Rankings & Benchmark Leaderboard Directory",
    path: "/api/v1/rankings",
    connections: 50,
  },
];

async function waitForServer(url: string, maxAttempts = 30): Promise<boolean> {
  console.log(`Checking server readiness at ${url}...`);
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${url}/api/v1/health`);
      if (res.status === 200 || res.status === 503) {
        console.log(`✓ Server ready and accepting connections!`);
        return true;
      }
    } catch {
      // Wait 1s and retry
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return false;
}

async function runAutocannon(scenario: Scenario): Promise<any> {
  console.log(`\n---------------------------------------------------------------`);
  console.log(`► Benchmarking: ${scenario.name}`);
  console.log(`  Endpoint:    ${scenario.path}`);
  console.log(`  Concurrency: ${scenario.connections} active connections | Duration: ${DURATION}s`);
  console.log(`---------------------------------------------------------------`);

  return new Promise((resolve, reject) => {
    autocannon(
      {
        url: `${BASE_URL}${scenario.path}`,
        connections: scenario.connections,
        duration: DURATION,
        headers: {
          accept: "application/json",
          "user-agent": "AI DETAILS-LoadTester/1.0",
          "x-load-test-bypass": "benchmark-secret",
        },
      },
      (err, result) => {
        if (err) return reject(err);

        console.log(`  Throughput:  ${result.requests.average.toFixed(1)} req/sec (Total: ${result.requests.total} requests)`);
        console.log(`  Latency:     p50: ${result.latency.p50} ms | p95: ${result.latency.p95} ms | p99: ${result.latency.p99} ms`);
        console.log(`  Errors:      ${result.non2xx + result.errors} (${(((result.non2xx + result.errors) / (result.requests.total || 1)) * 100).toFixed(2)}%)`);
        resolve(result);
      }
    );
  });
}

async function main() {
  console.log(`===============================================================`);
  console.log(`   AI DETAILS PRODUCTION READINESS & CAPACITY LOAD BENCHMARK`);
  console.log(`===============================================================`);

  const frontendDir = path.resolve(__dirname, "../../frontend");
  console.log(`Starting Next.js production server from: ${frontendDir}`);

  // Launch Next.js production server
  const serverProcess: ChildProcess = spawn(
    "npx",
    ["next", "start", "-p", String(PORT)],
    {
      cwd: frontendDir,
      stdio: "inherit",
      shell: true,
      env: {
        ...process.env,
        PORT: String(PORT),
        NODE_ENV: "production",
      },
    }
  );

  const cleanup = () => {
    try {
      if (serverProcess.pid) {
        process.kill(serverProcess.pid);
      }
    } catch {}
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  try {
    const isReady = await waitForServer(BASE_URL);
    if (!isReady) {
      console.error("Server failed to respond within timeout.");
      cleanup();
      process.exit(1);
    }

    const results: Array<{ scenario: string; throughput: number; p50: number; p95: number; p99: number; errors: number }> = [];

    for (const sc of SCENARIOS) {
      const res = await runAutocannon(sc);
      results.push({
        scenario: sc.name,
        throughput: Number(res.requests.average.toFixed(1)),
        p50: res.latency.p50,
        p95: res.latency.p95,
        p99: res.latency.p99,
        errors: res.non2xx + res.errors,
      });
    }

    console.log(`\n===============================================================`);
    console.log(`   FINAL VERIFIED PRODUCTION BENCHMARK SUMMARY`);
    console.log(`===============================================================`);
    console.table(results);
  } finally {
    cleanup();
    // Allow process to gracefully exit
    setTimeout(() => process.exit(0), 1000);
  }
}

main().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
