# AI Details — AI Model Discovery & Intelligence Platform

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-336791?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-6+-DC382D?style=flat&logo=redis)](https://redis.io/)
[![Clerk](https://img.shields.io/badge/Clerk-Auth-6C47FF?style=flat&logo=clerk)](https://clerk.com/)

**AI Details** is an open-source, developer-centric intelligence platform engineered to discover, evaluate, compare, and benchmark 640+ frontier and open-weights foundation AI models across 320+ inference providers and research labs with real-time pricing, context limits, and benchmark analytics.

---

## 🌟 Key Highlights & Capabilities

* **🔍 Comprehensive Model Catalog (`/models`)**: Search and filter across hundreds of proprietary and open-weight models. Filter by modalities (Text, Vision, Audio, Video), reasoning capability, open-weights status, minimum context length, maximum price per million tokens, and research lab.
* **⚡ Side-by-Side Comparison Engine (`/compare`)**: Compare up to 4 models concurrently across context windows, maximum output limits, multimodal capabilities, reasoning flags, input/output/cached pricing, and benchmark scores.
* **🏆 Standardized AI Benchmark Rankings (`/rankings`)**: Curated leaderboards across standard AI evaluations (MMLU, HumanEval, GSM8K, MATH, GPQA, etc.) categorised by Reasoning, Coding, Math, Knowledge, Multimodal, and Speed.
* **🏢 Provider & Lab Directories (`/providers`, `/labs`)**: Deep profiles of frontier labs (OpenAI, Anthropic, Google DeepMind, Meta, Mistral, DeepSeek) and inference providers (AWS Bedrock, Azure AI, Cloudflare Workers AI, Together AI, Fireworks, Groq, DeepInfra, OpenRouter).
* **🎯 Canonical Identity Resolution & Provenance Engine**: Robust identity resolution domain logic that decouples raw upstream supplier models (OpenRouter, Models.dev) from canonical models, utilizing normalized slugs, alias dictionaries, fuzzy candidate generation, confidence scoring, field-level provenance tracking, and conflict auditing.
* **🔄 Resilient Ingestion Pipeline**: Fault-tolerant multi-source sync runners powered by PostgreSQL advisory locks (`pg_try_advisory_lock`), transactional batching, and schema normalization.
* **🚀 Multi-Tier Resilient Caching**: Cache-Aside architecture featuring an L2 distributed Redis cache with automatic fallback to an L1 bounded in-memory LRU cache, single-flight promise deduplication to prevent cache stampedes, and namespace versioning for $O(1)$ group invalidations.
* **🔐 Authentication & Security**: Seamless user identity and authentication powered by Clerk, supporting protected application workflows, sign-in/sign-up flows, and rate limiting with ETag validation.
* **📊 Benchmarked Scalability**: Sub-millisecond parameterized PostgreSQL Common Table Expressions (CTEs) for multi-table catalog filtering, proven through K6 load testing suites.

---

## 🛠️ Technology Stack & Architecture

### Core Tech Stack
* **Runtime**: Node.js 20+ / 24 LTS
* **Language**: TypeScript 5 (Strict Mode across monorepo)
* **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS v4, Lucide React
* **Backend Domain & Services**: Pure TypeScript service layer with Zod schema validation
* **Database & ORM**: PostgreSQL 16+ (or Neon Serverless) with Prisma ORM 7 (`@prisma/adapter-pg`)
* **Caching Layer**: Redis (ioredis) L2 cache with L1 in-memory fallback
* **Authentication**: Clerk Authentication (`@clerk/nextjs`)
* **Performance & Testing**: K6, Autocannon, tsx

### Workspace Architecture
The monorepo uses a two-folder structure coordinated via npm workspaces:
* `@oneatlas/frontend` (`frontend/`): Next.js App Router application, server components, client interactivity, and UI design system.
* `@oneatlas/backend` (`backend/`): Database schema, Prisma client, domain identity resolution, ingestion coordinator, integration adapters, query services, and audit scripts.

---

## 📁 Repository Structure

```
AI_details/
├── frontend/                         # Next.js 16 App Router & UI System
│   ├── src/
│   │   ├── app/                      # Application routes & API endpoints
│   │   │   ├── (auth)/               # Clerk sign-in / sign-up routes
│   │   │   ├── api/v1/               # Production REST API (models, compare, rankings, etc.)
│   │   │   ├── models/               # Model discovery catalog & detail pages
│   │   │   ├── compare/              # Side-by-side comparison workspace
│   │   │   ├── rankings/             # Benchmark leaderboards & rankings
│   │   │   ├── providers/            # Inference providers directory & detail pages
│   │   │   ├── labs/                 # AI research labs directory & detail pages
│   │   │   ├── layout.tsx            # Global app layout with ClerkProvider
│   │   │   └── page.tsx              # Platform landing page & live stats
│   │   ├── components/               # Modular UI components & design system
│   │   │   ├── catalog/              # Model search, cards, filters, sorting
│   │   │   ├── compare/              # Multi-model comparison matrix
│   │   │   ├── rankings/             # Leaderboard tables & category chips
│   │   │   ├── search/               # Global search bar component
│   │   │   ├── layout/               # Navbar, footer, navigation shell
│   │   │   └── ui/                   # Button, Card, Badge, Input, Pagination, etc.
│   │   └── lib/                      # Frontend utilities, formatters, and API helpers
│   ├── public/                       # Static brand assets and icons
│   ├── next.config.ts                # Next.js configuration & API proxy rewrites
│   └── package.json                  # @oneatlas/frontend
│
├── backend/                          # Data, Ingestion & Business Domain
│   ├── prisma/                       # schema.prisma, migrations/, seed.ts
│   ├── prisma.config.ts              # Prisma ORM 7 configuration
│   ├── src/
│   │   ├── config/                   # Environment variables & runtime settings
│   │   ├── database/                 # Prisma client singleton & connection pooling
│   │   ├── domain/                   # Identity resolution, candidate ranking & provenance
│   │   ├── ingestion/                # Ingestion coordinator, contracts & advisory locks
│   │   ├── integrations/             # OpenRouter & Models.dev integration adapters
│   │   ├── services/                 # Models, comparison, rankings, providers & cache services
│   │   └── shared/                   # Shared types, Zod schemas, DTOs & constants
│   ├── scripts/                      # CLI sync runners, integration tests & audit scripts
│   └── package.json                  # @oneatlas/backend
│
├── tests/                            # Performance & Load Testing
│   └── k6/                           # K6 benchmark harness and load testing scripts
├── docker-compose.yml                # Local PostgreSQL container service
├── package.json                      # Monorepo coordinator & unified scripts
├── tsconfig.json                     # Monorepo project references
├── .env.example                      # Environment variables template
└── README.md                         # Project documentation
```

---

## 🏛️ Database Architecture & Relational Model

The database strictly decouples upstream ingestion sources from research labs, canonical AI models, and inference hosting providers:

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│      AiLab      │◀──┬───│    ModelLab     │───▶───│      Model      │
│  (Creator/Org)  │   │   │  (Join / Role)  │       │ (Canonical AI)  │
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
│(OpenRouter/etc.)│             │ (Per 1M Tokens) │ │  (Evaluations)  │
└─────────────────┘             └─────────────────┘ └─────────────────┘
```

### Key Relational Entities
* **`Model`**: The canonical representation of an artificial intelligence model (e.g. `claude-3-5-sonnet`, `gpt-4o`, `deepseek-r1`), storing canonical context windows, architecture type, reasoning flags, release dates, and modalities.
* **`AiLab`**: Research labs creating or publishing foundation models (e.g. Anthropic, OpenAI, DeepSeek, Meta AI).
* **`ModelLab`**: Explicit join table modeling creator, publisher, or collaborator roles between models and labs.
* **`Provider`**: Inference execution entities (e.g. AWS Bedrock, Together AI, Fireworks, Groq, OpenRouter).
* **`ModelProviderEndpoint`**: Active hosting endpoints tying a canonical model to a provider with specific status, latency, context windows, and parameters.
* **`PricingRecord`**: Historical and real-time input, output, cached, and batch token pricing per million tokens.
* **`BenchmarkResult` & `Benchmark`**: Canonical evaluation benchmarks (MMLU, HumanEval, GPQA, etc.) and model performance scores.
* **`ModelSourceMapping` & `EntityFieldProvenance`**: Tracks the exact source, confidence, and timestamp for each model attribute.
* **`MetadataConflict`**: Logs and tracks discrepancies across upstream data providers for human or automated review.

---

## ⚡ Getting Started (Local Setup)

### 1. Prerequisites
* **Node.js**: `v20.x` or `v24.x LTS`
* **npm**: `v10.x+`
* **Docker & Docker Compose** (for local PostgreSQL) or an active Neon/Supabase PostgreSQL connection
* **Redis** (optional, platform gracefully falls back to in-memory LRU cache if absent)

### 2. Clone and Install Dependencies
```bash
git clone https://github.com/your-username/ai-details.git
cd ai-details/AI_details

# Install all workspace dependencies and generate Prisma Client
npm install
```

### 3. Environment Configuration
Copy the `.env.example` file to create your `.env` in the root (and `.env.local` in `frontend/` if overriding client keys):
```bash
cp .env.example .env
```

Configure your credentials inside `.env`:
```env
# PostgreSQL connection string
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/aidetails?schema=public"

# Connection pool sizing
DB_POOL_MAX=10

# Redis Cache (Optional - falls back to bounded in-memory cache if omitted)
REDIS_URL="redis://localhost:6379"

# Clerk Authentication (Get these from https://dashboard.clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/models"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/models"

# Upstream Ingestion APIs (Optional - required to run catalog sync scripts)
OPENROUTER_API_KEY="your-openrouter-key"
OPENROUTER_MANAGEMENT_KEY="your-openrouter-management-key"
```

### 4. Start Local Database (via Docker)
If using Docker for local PostgreSQL:
```bash
docker compose up -d
```

### 5. Run Database Migrations and Seed Baseline Data
```bash
# Push schema migrations to the database
npm run db:migrate:dev

# Seed baseline AI labs, external sources, inference providers, and benchmarks
npm run db:seed
```

### 6. Sync Model Catalog (Ingestion)
Synchronize real-time AI models, endpoints, and pricing from OpenRouter and Models.dev:
```bash
# Run multi-source coordinated sync
npm run sync:all

# Or sync specific providers individually
npm run sync:openrouter
npm run sync:modelsdev
```

### 7. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📡 REST API Reference

The platform includes a high-performance Next.js API located under `/api/v1/`.

| Endpoint | Method | Description | Key Parameters |
| :--- | :--- | :--- | :--- |
| `/api/v1/health` | `GET` | Health status of DB, cache, and runtime | None |
| `/api/v1/models` | `GET` | Filterable, paginated model catalog | `q`, `modality`, `isReasoning`, `isOpenWeight`, `lab`, `provider`, `minContext`, `maxInputPrice`, `sort`, `order`, `page`, `limit` |
| `/api/v1/models/[slug]` | `GET` | Detailed model profile & endpoints | `slug` (path) |
| `/api/v1/models/[slug]/pricing-history` | `GET` | Historical pricing data for charts | `slug` (path), `days` |
| `/api/v1/compare` | `GET` | Multi-model side-by-side comparison | `slugs` (comma-separated, e.g. `gpt-4o,claude-3-5-sonnet`) |
| `/api/v1/rankings` | `GET` | Benchmark leaderboards & summaries | `category` (Reasoning, Coding, Math, etc.), `limit` |
| `/api/v1/rankings/[benchmarkSlug]` | `GET` | Rankings for a specific benchmark | `benchmarkSlug` (path) |
| `/api/v1/providers` | `GET` | Inference provider directory | `type`, `page`, `limit` |
| `/api/v1/providers/[slug]` | `GET` | Provider details, endpoints & models | `slug` (path) |
| `/api/v1/labs` | `GET` | AI research lab directory | `page`, `limit` |
| `/api/v1/labs/[slug]` | `GET` | Lab profile, created models & stats | `slug` (path) |

### Example Request: Filter Models
```bash
curl -X GET "http://localhost:3000/api/v1/models?modality=vision&isReasoning=true&sort=newest&limit=10"
```

---

## 📜 Complete CLI & npm Scripts Guide

All commands can be executed directly from the monorepo root:

### Development & Build
| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts Next.js development server on `localhost:3000` |
| `npm run build` | Builds the frontend and server routes for production |
| `npm run start` | Launches production Next.js server |
| `npm run lint` | Runs ESLint analysis across the frontend codebase |
| `npm run typecheck` | Executes strict TypeScript compilation checks across all workspaces |

### Database Management (`@oneatlas/backend`)
| Command | Description |
| :--- | :--- |
| `npm run db:validate` | Validates Prisma schema syntax and relations |
| `npm run db:generate` | Generates typed Prisma client in `backend/src/generated/prisma` |
| `npm run db:migrate:dev` | Applies pending migrations in local development mode |
| `npm run db:migrate:deploy` | Applies migrations in production / staging CI pipelines |
| `npm run db:migrate:status` | Checks database migration synchronization status |
| `npm run db:seed` | Populates database with seed labs, providers, and benchmarks |
| `npm run db:studio` | Opens visual Prisma Studio UI for database browsing |
| `npm run db:smoke-test` | Runs 12 automated database connectivity & relational assertions |

### Ingestion & Data Synchronization
| Command | Description |
| :--- | :--- |
| `npm run sync:all` | Coordinates multi-source ingestion with advisory locks & batching |
| `npm run sync:openrouter` | Synchronizes OpenRouter catalog, models, and endpoints |
| `npm run sync:modelsdev` | Synchronizes Models.dev catalog and provider mappings |

### Integrity Audits & Domain Verification
| Command | Description |
| :--- | :--- |
| `npm run audit:data-integrity` | Audits foreign key integrity, missing slugs, and orphans |
| `npm run audit:provenance` | Inspects field-level attribute provenance confidence |
| `npm run audit:conflicts` | Reports and summarizes unresolved cross-source metadata conflicts |
| `npm run audit:endpoints` | Validates provider endpoint pricing records and availability |

### Automated Integration & Service Tests
| Command | Description |
| :--- | :--- |
| `npm run test:api` | Tests REST API routing, pagination, and error contract shapes |
| `npm run test:models-query` | Tests model catalog parameterized CTE queries and filters |
| `npm run test:model-detail` | Verifies detailed model profile queries and endpoint resolution |
| `npm run test:compare` | Verifies side-by-side comparison query engine |
| `npm run test:compare-workflow`| Tests comparison matrix formatting and edge cases |
| `npm run test:rankings` | Tests benchmark rankings and category aggregation |
| `npm run test:providers-query` | Verifies provider directory queries and model associations |
| `npm run test:labs-query` | Verifies lab directory queries and portfolio calculations |
| `npm run test:resolution` | Tests identity resolution, candidate generation, and ranking |
| `npm run test:coordinator` | Tests ingestion coordinator locking and plan execution |
| `npm run test:openrouter` | Validates OpenRouter normalization and pricing transforms |
| `npm run test:modelsdev` | Validates Models.dev slug normalization and transforms |

### Performance Benchmarking & Load Testing
| Command | Description |
| :--- | :--- |
| `npm run test:load` | Runs K6 load testing suite against local catalog endpoints |
| `npm run bench:load` | Executes custom high-concurrency Node.js benchmark harness |

---

## 🗺️ Project Implementation Roadmap

* [x] **Phase 1: Architecture & Data Modeling**
  * Decoupled relational PostgreSQL schema (Prisma ORM 7).
  * Monorepo workspace setup (`frontend`, `backend`).
* [x] **Phase 2: Database Layer & Tooling Setup**
  * PostgreSQL connection pooling with `@prisma/adapter-pg`.
  * Automated migration scripts, database smoke tests, and baseline seeding.
* [x] **Phase 3A-3C: Ingestion, Normalization & Identity Resolution**
  * Upstream OpenRouter & Models.dev integration clients.
  * Canonical identity resolution engine with fuzzy candidate ranking.
  * Field-level provenance tracking and conflict detection engine.
* [x] **Phase 3D: Multi-Source Shared Ingestion Engine**
  * Ingestion coordinator with PostgreSQL advisory locks and batching.
  * End-to-end sync runners (`sync:all`, `sync:openrouter`, `sync:modelsdev`).
* [x] **Phase 4: Backend Services & REST API v1**
  * High-performance parameterized SQL CTE query services for model discovery.
  * Side-by-side comparison, benchmark rankings, provider, and lab services.
  * REST API v1 endpoints with Zod validation, ETags, and rate limiting.
* [x] **Phase 5: Resilient Caching & Performance Optimization**
  * Multi-tier Cache-Aside engine (L2 Redis + L1 in-memory LRU).
  * Single-flight promise deduplication to prevent cache stampedes.
  * K6 load testing suite validating high-throughput sub-millisecond execution.
* [x] **Phase 6: Frontend Experience & UI Design System**
  * Modern Next.js 16 App Router UI styled with Tailwind CSS v4.
  * Interactive Model Catalog (`/models`) with real-time filters and search.
  * Model Detail page (`/models/[slug]`) with endpoint list and specs.
  * Interactive Side-by-Side Comparison tool (`/compare`).
  * Benchmark Rankings Leaderboard (`/rankings`).
  * Provider and Lab Directories (`/providers`, `/labs`).
  * Responsive landing page with ecosystem overview and live stats.
* [x] **Phase 7: Authentication & Access Control**
  * Integrated Clerk Authentication with custom sign-in and sign-up flows.
  * User state synchronization and protected routes.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'feat: add amazing feature'`).
4. Ensure all typechecks and tests pass (`npm run typecheck && npm run test:api`).
5. Push to your branch (`git push origin feature/amazing-feature`).
6. Open a Pull Request.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
