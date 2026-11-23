/**
 * Shared constants for the AI Details platform.
 */

export * from "./api";

/** Platform navigation routes */
export const ROUTES = {
  HOME: "/",
  MODELS: "/models",
  COMPARE: "/compare",
  RANKINGS: "/rankings",
  PROVIDERS: "/providers",
  LABS: "/labs",
} as const;

/** Platform metadata */
export const PLATFORM = {
  NAME: "AI Details",
  TAGLINE: "AI Model Discovery & Intelligence Platform",
  DESCRIPTION: "Discover, understand and compare AI models across leading research labs and inference providers.",
} as const;
