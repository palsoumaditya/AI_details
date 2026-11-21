/**
 * Core utility functions placeholder for OneAtlas
 */
export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
