# OneAtlas.dev — AI Model Discovery & Intelligence Platform

OneAtlas is a developer-centric intelligence platform to discover, evaluate, compare, and benchmark frontier and open-source artificial intelligence models across diverse inference providers and research labs.

---

## 🛠️ Technology Stack (Phase 2B)

* **Framework:** [Next.js](https://nextjs.org/) (App Router, React 19)
* **Language:** [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
* **Database & ORM:** [PostgreSQL](https://www.postgresql.org/) & [Prisma ORM 7](https://www.prisma.io/)
* **Database Driver Adapter:** `@prisma/adapter-pg` with connection pooling
* **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) with `@tailwindcss/postcss`
* **Validation:** [Zod](https://zod.dev/) for runtime environment and schema enforcement
* **Linting & Code Quality:** ESLint with `eslint-config-next`

---

## 🏛️ Database Architecture & Data Model

The OneAtlas database is designed as the single source of truth for AI model intelligence. It strictly decouples external ingestion sources from execution providers and canonical models.

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│      AiLab      │◀──┬───│    ModelLab     │───▶───│      Model      │
└─────────────────┘   │   └─────────────────┘       └─────────────────┘
                      │                                      ▲
                      │         ┌─────────────────┐          │
                      │         │  ModelProvider  │──────────┤
                      │         │    Endpoint     │          │
                      │         └─────────────────┘          │
                      │                  │                   │
                      │                  ▼                   ▼
┌─────────────────┐   │         ┌─────────────────┐ ┌─────────────────┐
│ ExternalSource  │───┴────────▶│  PricingRecord  │ │ BenchmarkResult │
│ (Data Supplier) │             │  (Historical)   │ │  (Evaluations)  │
└─────────────────┘             └─────────────────┘ └─────────────────┘
```

### Core Entities & Responsibilities

1. **`AiLab` (`ai_labs`):** AI research organizations and creators (e.g. OpenAI, Anthropic, Google DeepMind, DeepSeek).
2. **`Model` (`models`):** Canonical specifications, parameters, release dates, licenses, and architecture of AI models.
3. **`ModelLab` (`model_labs`):** Many-to-many join table supporting multiple organizations per model with explicit roles (`CREATOR`, `PUBLISHER`, `COLLABORATOR`).
4. **`Provider` (`providers`):** AI inference hosts where developers access models (e.g. OpenAI Direct, Together AI, Groq, Google Cloud Vertex).
5. **`ExternalSource` (`external_sources`):** Data ingestion suppliers where OneAtlas fetches information (OpenRouter API, Models.dev, Hugging Face, Artificial Analysis).
6. **`ModelSourceMapping` (`model_source_mappings`):** Resolves vendor-specific model IDs to canonical OneAtlas models.
7. **`ModelProviderEndpoint` (`model_provider_endpoints`):** Provider-specific endpoints tracking endpoint-level context windows, token limits, and availability.
8. **`PricingRecord` (`pricing_records`):** Immutable historical price snapshots stored as PostgreSQL `Decimal(20, 10)` in normalized USD per 1M tokens.
9. **`Benchmark` (`benchmarks`):** Benchmark definitions with versioning (`slug` + `version` unique constraint) and metric units.
10. **`BenchmarkResult` (`benchmark_results`):** Individual model evaluation scores with full provenance and metric metadata.
11. **`SyncRun` (`sync_runs`):** Ingestion audit logs tracking items processed, inserted, updated, skipped, and error details.
12. **`RawSourceRecord` (`raw_source_records`):** Immutable JSONB payload cache with SHA-256 deduplication hashes.

---

## 🚀 Getting Started & Local PostgreSQL Setup

### 1. Prerequisites

* **Node.js:** `v20.x` or higher (`v24.15.0` LTS recommended)
* **npm:** `v10.x` or higher
* **PostgreSQL:** Local PostgreSQL 16+ OR Docker Desktop OR Managed PostgreSQL (Neon, Supabase)

### 2. Configure Local PostgreSQL (via Docker Compose)

A production-ready `docker-compose.yml` is included in the project:

```bash
# Start local PostgreSQL 16 container
docker compose up -d

# Check container status
docker compose ps
```

### 3. Environment Variables Configuration

Copy `.env.example` to create your local `.env`:

```bash
cp .env.example .env
```

Configure your connection strings:

```env
# Application Runtime (Supports connection poolers like PgBouncer)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/oneatlas?schema=public"

# Direct Connection for Prisma CLI Migrations
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/oneatlas?schema=public"

# Connection Pool Sizing
DB_POOL_MAX=10
```

### 4. Database Initialization & Seeding

```bash
# Validate Prisma 7 Schema
npm run db:validate

# Generate Prisma Client
npm run db:generate

# Apply Migrations to PostgreSQL
npm run db:migrate:dev

# Seed Baseline Reference Data (Idempotent)
npm run db:seed

# Verify Database with Smoke Tests
npm run db:smoke-test
```

---

## 📜 Available NPM Scripts

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `npm run dev` | `next dev --webpack` | Starts the Next.js development server |
| `npm run build` | `next build --webpack` | Compiles optimized production bundle |
| `npm run lint` | `eslint` | Executes ESLint flat configuration |
| `npm run typecheck` | `tsc --noEmit` | Validates strict TypeScript compilation |
| `npm run db:validate` | `prisma validate` | Validates `schema.prisma` syntax and rules |
| `npm run db:generate` | `prisma generate` | Generates TypeScript Prisma Client into `src/generated/prisma` |
| `npm run db:migrate:dev` | `prisma migrate dev` | Applies pending migrations in development |
| `npm run db:migrate:deploy` | `prisma migrate deploy` | Applies migrations in production/CI |
| `npm run db:seed` | `prisma db seed` | Executes idempotent database seeding script |
| `npm run db:studio` | `prisma studio` | Opens Prisma Studio web UI for database inspection |
| `npm run db:smoke-test` | `tsx scripts/db-smoke-test.ts` | Runs automated database connectivity and relation tests |

---

## 🔄 Database Development Workflow

1. **Modify Schema:** Make changes in `prisma/schema.prisma`.
2. **Validate:** Run `npm run db:validate`.
3. **Generate Client:** Run `npm run db:generate` to regenerate typed models.
4. **Create Migration:** Run `npm run db:migrate:dev --name your_migration_name`.
5. **Never Use Destructive Reset:** Never run `prisma migrate reset` or `prisma db push` in shared or production environments.

---

## 🗺️ Roadmap & Implementation Tracker

* [x] **Phase 1:** Repository Audit & System Architecture
* [x] **Phase 2A:** Next.js Project Foundation & Tooling Setup
* [x] **Phase 2B:** Database Foundation, PostgreSQL Schema & Prisma ORM 7
* [ ] **Phase 3:** External Data Adapters & Ingestion Engine (OpenRouter, Models.dev, Hugging Face, Artificial Analysis)
* [ ] **Phase 4:** Backend APIs & Business Domain Services
* [ ] **Phase 5:** Model Discovery Catalog & Search UI
* [ ] **Phase 6:** Side-by-Side Comparison & Benchmarks Engine
* [ ] **Phase 7:** Provider/Lab Directories, Optimization & Deployment Readiness
