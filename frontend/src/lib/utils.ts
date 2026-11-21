/**
 * Core utility functions for OneAtlas frontend
 */
export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
