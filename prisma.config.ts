import "dotenv/config";
import { defineConfig } from "prisma/config";

const rawUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/oneatlas?schema=public";
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
