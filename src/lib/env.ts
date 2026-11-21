import { z } from "zod";

/**
 * Environment variable schema validation for OneAtlas
 * Validates database connectivity, pool sizing, and runtime environment.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z
    .string()
    .url("DATABASE_URL must be a valid URL")
    .refine(
      (url) => url.startsWith("postgresql://") || url.startsWith("postgres://"),
      {
        message: "DATABASE_URL must use the postgresql:// or postgres:// protocol",
      }
    )
    .default("postgresql://postgres:postgres@localhost:5432/oneatlas?schema=public"),
  DIRECT_URL: z
    .string()
    .url("DIRECT_URL must be a valid URL")
    .refine(
      (url) => url.startsWith("postgresql://") || url.startsWith("postgres://"),
      {
        message: "DIRECT_URL must use the postgresql:// or postgres:// protocol",
      }
    )
    .optional(),
  DB_POOL_MAX: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(100))
    .default(10),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    "❌ Invalid environment variables configuration:",
    JSON.stringify(parsedEnv.error.format(), null, 2)
  );
  throw new Error("Invalid environment variables");
}

export const env = parsedEnv.data;
