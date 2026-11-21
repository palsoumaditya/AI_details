# OneAtlas.dev — AI Model Discovery & Intelligence Platform

OneAtlas is a developer-centric intelligence platform to discover, evaluate, compare, and benchmark frontier and open-source artificial intelligence models across diverse inference providers and research labs.

---

## 🛠️ Technology Stack & Workspace Architecture

* **Architecture:** Two-folder Workspace Architecture
  * `@oneatlas/frontend`: Next.js 16 (App Router), React 19, Tailwind CSS v4, Lucide icons
  * `@oneatlas/backend`: Business logic, Prisma ORM 7 database layer, integrations (OpenRouter, Models.dev), canonical identity resolution, provenance engine, conflict detection, ingestion coordinator, shared contracts
* **Runtime:** Node.js 24 LTS
* **Language:** TypeScript 5 (Strict Mode across both workspaces)
* **Database:** PostgreSQL 18.7 (Neon Serverless PostgreSQL)
* **ORM:** Prisma ORM 7.10.1 with `@prisma/adapter-pg` driver adapter
* **Styling:** Tailwind CSS v4 with `@tailwindcss/postcss`
* **Validation:** Zod for runtime schema validation

---

## 📁 Workspace Structure

```
AI_details/
├── frontend/                     # Next.js 16 Application Runtime & Product UI
│   ├── src/
│   │   ├── app/                  # App Router: /, /models, /compare, /rankings, /providers, /labs
│   │   ├── components/           # UI primitives (button, card, input, etc.) & application shell
│   │   └── lib/                  # Frontend utilities
│   ├── public/                   # Static assets
│   ├── next.config.ts
│   └── package.json              # @oneatlas/frontend
│
├── backend/                      # Domain Logic, Integrations, Ingestion & Database
│   ├── prisma/                   # schema.prisma, migrations/, seed.ts
│   ├── prisma.config.ts          # Prisma ORM 7 configuration
│   ├── src/
│   │   ├── database/             # Client factory, singleton, typed re-exports
│   │   ├── domain/               # Identity resolution, provenance, conflict tracking
│   │   ├── integrations/         # OpenRouter & Models.dev clients, services, mappers
│   │   ├── ingestion/            # Multi-source coordination, advisory locks, batching
│   │   ├── shared/               # Shared contracts, DTO types, Zod schemas, constants
│   │   └── config/               # Environment configuration
│   ├── scripts/                  # CLI sync, test, and audit runners
│   └── package.json              # @oneatlas/backend
│
├── package.json                  # Root workspace coordinator
├── tsconfig.json                 # Monorepo project references
├── .env.example
└── README.md
```

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

---

## 🚀 Available Workspace Scripts

Run from the monorepo root:

### Development & Build
* `npm run dev`: Starts Next.js development server
* `npm run build`: Production Next.js build
* `npm run start`: Starts production Next.js server
* `npm run lint`: Runs ESLint on frontend workspace
* `npm run typecheck`: Validates TypeScript strict compilation across all 4 workspaces

### Database Operations (`@oneatlas/database`)
* `npm run db:validate`: Validates `schema.prisma`
* `npm run db:generate`: Generates Prisma Client into `packages/database/src/generated/prisma`
* `npm run db:migrate:status`: Checks pending migration status against PostgreSQL
* `npm run db:migrate:dev`: Applies pending migrations in development
* `npm run db:seed`: Seeds baseline AI labs, external sources, inference providers, benchmarks

### Backend Tests & Ingestion (`@oneatlas/backend`)
* `npm run db:smoke-test`: Executes 12 automated database connectivity & relational verifications
* `npm run test:openrouter`: Runs OpenRouter normalization, schemas, and pricing tests
* `npm run test:modelsdev`: Runs Models.dev normalization, slugs, and pricing tests
* `npm run test:resolution`: Runs canonical identity resolution, confidence, and provenance tests
* `npm run test:coordinator`: Runs ingestion coordinator, advisory locks, and multi-source plan tests
* `npm run sync:openrouter`: CLI script to sync OpenRouter catalog
* `npm run sync:modelsdev`: CLI script to sync Models.dev catalog
* `npm run sync:all`: Coordinates multi-source ingestion
* `npm run audit:data-integrity`: Audits database integrity
* `npm run audit:provenance`: Audits field-level provenance
* `npm run audit:conflicts`: Audits unresolved metadata conflicts

---

## 🗺️ Roadmap & Implementation Tracker

* [x] **Phase 1:** Repository Audit & System Architecture
* [x] **Phase 2A:** Next.js Project Foundation & Tooling Setup
* [x] **Phase 2B:** Database Foundation, PostgreSQL Schema & Prisma ORM 7
* [x] **Phase 2B.1:** Live Database Verification
* [x] **Phase 3A:** OpenRouter Integration & Pricing Normalization
* [x] **Phase 3B:** Models.dev Integration & Provider Catalog
* [x] **Phase 3C:** Canonical Identity Resolution & Candidate Matching
* [x] **Phase 3C.1:** Data Integrity and Provenance Hardening
* [x] **Phase 3C.2:** Monorepo Restructuring & Frontend Product UI Foundation
* [ ] **Phase 3D:** Multi-Source Shared Ingestion Engine
* [ ] **Phase 4:** Backend APIs & Business Domain Services
* [ ] **Phase 5:** Model Discovery Catalog & Search UI
* [ ] **Phase 6:** Side-by-Side Comparison & Benchmarks Engine
* [ ] **Phase 7:** Provider/Lab Directories, Optimization & Deployment Readiness
