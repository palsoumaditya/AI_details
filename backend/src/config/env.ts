import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

/**
 * Environment variable schema validation for AI Details backend
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
    .default("postgresql://postgres:postgres@localhost:5432/aidetails?schema=public"),
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
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  OPENROUTER_MANAGEMENT_KEY: z.string().min(1).optional(),
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
