/**
 * @oneatlas/backend — Backend package public API
 *
 * Re-exports integration services, domain logic, and ingestion infrastructure.
 */

// Integration modules
export * as openrouter from "./integrations/openrouter/index";
export * as modelsdev from "./integrations/modelsdev/index";

// Domain logic
export * as identityResolution from "./domain/identity-resolution/index";

// Ingestion infrastructure
export * as ingestion from "./ingestion/coordinator/index";
export * as ingestionContracts from "./ingestion/contracts/index";
