import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load local .env if present, then fallback to project root .env
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const rawUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/aidetails?schema=public";
// Neon pooler URLs (-pooler) do not support PostgreSQL session-level advisory locks needed for migrations.
// Direct endpoint safely strips -pooler for CLI migration operations while preserving runtime pooling in DATABASE_URL.
const databaseUrl = rawUrl.replace("-pooler.", ".");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});
