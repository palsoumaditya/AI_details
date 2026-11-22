async function runApiVerification() {
  const baseUrl = "http://localhost:3000";
  console.log("================================================================================");
  console.log("ONEATLAS TASK 6.1: LIVE API ENDPOINT VERIFICATION (TARGET: " + baseUrl + ")");
  console.log("================================================================================\n");

  const endpoints = [
    { name: "Rankings Directory", url: `${baseUrl}/api/v1/rankings` },
    { name: "Directory Filtered by Category (CODING)", url: `${baseUrl}/api/v1/rankings?category=CODING` },
    { name: "Directory Filtered by Category (REASONING)", url: `${baseUrl}/api/v1/rankings?category=REASONING` },
    { name: "Directory Search (q=speed)", url: `${baseUrl}/api/v1/rankings?q=speed` },
    { name: "GPQA Leaderboard", url: `${baseUrl}/api/v1/rankings/gpqa` },
    { name: "MMLU-Pro Leaderboard", url: `${baseUrl}/api/v1/rankings/mmlu_pro` },
    { name: "LiveCodeBench Leaderboard", url: `${baseUrl}/api/v1/rankings/livecodebench` },
    { name: "Output Token Speed Leaderboard", url: `${baseUrl}/api/v1/rankings/throughput` },
    { name: "Search & Lab Filter", url: `${baseUrl}/api/v1/rankings/mmlu_pro?q=gpt&lab=openai` },
    { name: "Pagination (page=2, limit=5)", url: `${baseUrl}/api/v1/rankings/mmlu_pro?page=2&limit=5` },
    { name: "Nonexistent Benchmark (404 expected)", url: `${baseUrl}/api/v1/rankings/nonexistent_benchmark` },
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url);
      const data: any = await res.json();
      console.log(`[HTTP ${res.status}] ${ep.name}`);
      console.log(`  URL: ${ep.url}`);
      if (res.ok) {
        if (data.data.benchmarks) {
          console.log(`  Data Summary: ${data.data.totalBenchmarks} benchmarks returned, ${data.data.categories?.length} categories`);
          console.log(`  Sample: [${data.data.benchmarks.map((b: any) => b.slug).join(", ")}]`);
        } else if (data.data.benchmark) {
          console.log(`  Benchmark: "${data.data.benchmark.name}" (${data.data.benchmark.slug}) - higherIsBetter: ${data.data.benchmark.higherIsBetter}`);
          console.log(`  Rankings count: ${data.data.rankings.length}, Total: ${data.data.pagination.total}, TotalPages: ${data.data.pagination.totalPages}`);
        }
      } else {
        console.log(`  Error Code: ${data.error?.code}, Message: "${data.error?.message}"`);
      }
      console.log("");
    } catch (err: any) {
      console.error(`  Failed to fetch ${ep.url}:`, err.message);
    }
  }
}

runApiVerification();
