import "./env";
import { prisma } from "../src/database/index";

async function auditLiveDatabase() {
  console.log("================================================================================");
  console.log("AI DETAILS TASK 6.1: NEON POSTGRESQL BENCHMARK COVERAGE AUDIT");
  console.log("================================================================================\n");

  const benchmarks = await prisma.benchmark.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      results: {
        select: {
          id: true,
          modelId: true,
          metricValue: true,
          evaluationDate: true,
          observedAt: true,
        },
      },
    },
  });

  const totalModelsCount = await prisma.model.count();
  const totalResultsCount = await prisma.benchmarkResult.count();

  console.log(`Total Models in Database: ${totalModelsCount}`);
  console.log(`Total Benchmarks in Database: ${benchmarks.length}`);
  console.log(`Total BenchmarkResult Records in Database: ${totalResultsCount}\n`);

  console.log("--------------------------------------------------------------------------------");
  console.log("BENCHMARK-BY-BENCHMARK BREAKDOWN:");
  console.log("--------------------------------------------------------------------------------");

  for (const b of benchmarks) {
    const totalRecords = b.results.length;
    const modelEvaluationCountMap = new Map<string, number>();
    let latestEvalDate: Date | null = null;

    for (const res of b.results) {
      modelEvaluationCountMap.set(
        res.modelId,
        (modelEvaluationCountMap.get(res.modelId) ?? 0) + 1
      );
      const evalDate = res.evaluationDate ?? res.observedAt;
      if (!latestEvalDate || evalDate > latestEvalDate) {
        latestEvalDate = evalDate;
      }
    }

    const distinctModels = modelEvaluationCountMap.size;
    let duplicateEvaluations = 0;
    for (const count of modelEvaluationCountMap.values()) {
      if (count > 1) {
        duplicateEvaluations += (count - 1);
      }
    }

    const hasEnoughData = totalRecords > 0;

    console.log(`Benchmark: "${b.name}" (${b.slug})`);
    console.log(`  - Version:                ${b.version}`);
    console.log(`  - Category:               ${b.category}`);
    console.log(`  - Metric:                 ${b.metricName} (${b.metricUnit})`);
    console.log(`  - Higher Is Better:       ${b.higherIsBetter}`);
    console.log(`  - Total Result Records:   ${totalRecords}`);
    console.log(`  - Distinct Models:        ${distinctModels}`);
    console.log(`  - Duplicate Evaluations:  ${duplicateEvaluations}`);
    console.log(`  - Latest Evaluation Date: ${latestEvalDate ? latestEvalDate.toISOString() : "None"}`);
    console.log(`  - Has Enough Data:        ${hasEnoughData ? "YES" : "NO (Empty state displayed)"}`);
    console.log("");
  }

  await prisma.$disconnect();
}

auditLiveDatabase().catch((err) => {
  console.error("Audit error:", err);
  process.exit(1);
});
