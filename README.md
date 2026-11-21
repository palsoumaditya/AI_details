# OneAtlas.dev — AI Model Discovery & Intelligence Platform

OneAtlas is a developer-centric intelligence platform to discover, evaluate, compare, and benchmark frontier and open-source artificial intelligence models across diverse inference providers and research labs.

---

## 🛠️ Technology Foundation (Phase 2A)

* **Framework:** [Next.js](https://nextjs.org/) (App Router, React 19)
* **Language:** [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
* **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) with `@tailwindcss/postcss`
* **Linting & Code Quality:** ESLint with `eslint-config-next`

---

## 🚀 Getting Started

### Prerequisites

* **Node.js:** v20.x or higher (LTS recommended, tested on Node v24.15.0)
* **npm:** v10.x or higher

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/palsoumaditya/AI_details.git
cd AI_details
npm install
```

### Development Server

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application shell.

### Available Scripts

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `npm run dev` | `next dev --webpack` | Starts the local Next.js development server |
| `npm run build` | `next build --webpack` | Compiles optimized production bundle |
| `npm run start` | `next start` | Starts production server locally after build |
| `npm run lint` | `eslint` | Executes ESLint to check for code issues |
| `npm run typecheck` | `tsc --noEmit` | Validates TypeScript static types across the project |

---

## 📂 Project Structure

```
AI_details/
├── public/                 # Static public assets
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── layout.tsx      # Root application layout
│   │   ├── page.tsx        # OneAtlas homepage application shell
│   │   ├── globals.css     # Tailwind CSS v4 directives & theme
│   │   ├── error.tsx       # Global error boundary
│   │   └── not-found.tsx   # 404 handler
│   ├── components/         # Shared presentation components
│   └── lib/                # Shared utilities
├── .gitignore              # Ignored files (node_modules, .env*, build artifacts)
├── package.json            # Project manifest & scripts
├── package-lock.json       # Exact locked dependency graph
├── tsconfig.json           # TypeScript strict compiler configuration
├── next.config.ts          # Next.js runtime configuration
├── postcss.config.mjs      # PostCSS configuration for Tailwind v4
├── eslint.config.mjs       # Flat ESLint configuration
└── README.md               # Project documentation and setup guide
```

---

## 🗺️ Roadmap & Implementation Phases

* [x] **Phase 1:** Repository Audit & System Architecture
* [x] **Phase 2A:** Next.js Project Foundation & Tooling Setup
* [ ] **Phase 2B:** Database Layer, PostgreSQL Driver Adapter & Prisma Configuration
* [ ] **Phase 3:** External Data Adapters & Ingestion Engine (OpenRouter, Models.dev, Hugging Face, Artificial Analysis)
* [ ] **Phase 4:** Backend APIs & Business Domain Services
* [ ] **Phase 5:** Model Discovery Catalog & Search UI
* [ ] **Phase 6:** Side-by-Side Comparison & Benchmarks Engine
* [ ] **Phase 7:** Provider/Lab Directories, Optimization & Deployment Readiness
