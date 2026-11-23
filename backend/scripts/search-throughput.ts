async function searchThroughput() {
  const [mRes, aRes] = await Promise.all([
    fetch("https://models.dev/models.json?type=all"),
    fetch("https://models.dev/api.json?type=all")
  ]);
  const models = await mRes.json() as Record<string, any>;
  const providers = await aRes.json() as Record<string, any>;

  console.log("Searching models for speed/throughput/tps...");
  for (const [id, m] of Object.entries(models)) {
    const str = JSON.stringify(m).toLowerCase();
    if (str.includes("tokens/s") || str.includes("tokens_per_sec") || str.includes("throughput")) {
      console.log(`Found in model ${id}!`);
      break;
    }
  }

  console.log("Searching providers for speed/throughput/tps...");
  for (const [pId, p] of Object.entries(providers)) {
    const str = JSON.stringify(p).toLowerCase();
    if (str.includes("tokens/s") || str.includes("tokens_per_sec") || str.includes("throughput")) {
      console.log(`Found in provider ${pId}!`);
      break;
    }
  }
  console.log("Search complete.");
}
searchThroughput();
