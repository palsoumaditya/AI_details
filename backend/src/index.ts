/**
 * @oneatlas/backend — Backend package public API
 *
 * Re-exports integration services, domain logic, ingestion infrastructure,
 * database client, and shared contracts.
 */

// Database client & models
export * as database from "./database/index";
export { createPrismaClient, getPrismaClient, prisma } from "./database/index";

// Shared types & contracts
export * as shared from "./shared/index";

// Integration modules
export * as openrouter from "./integrations/openrouter/index";
export * as modelsdev from "./integrations/modelsdev/index";

// Domain logic
export * as identityResolution from "./domain/identity-resolution/index";

// Ingestion infrastructure
export * as ingestion from "./ingestion/coordinator/index";
export * as ingestionContracts from "./ingestion/contracts/index";
