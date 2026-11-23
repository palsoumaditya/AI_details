/**
 * Data presentation formatters for AI Details
 */

/**
 * Formats token count into human-readable shorthand (e.g., 128000 -> "128K", 1000000 -> "1M")
 */
export function formatContextWindow(tokens: number | null | undefined): string {
  if (tokens == null || isNaN(tokens) || tokens <= 0) return "—";

  if (tokens >= 1_000_000) {
    const millions = tokens / 1_000_000;
    return `${Number.isInteger(millions) ? millions : millions.toFixed(1)}M`;
  }

  if (tokens >= 1_000) {
    const thousands = Math.round(tokens / 1_000);
    return `${thousands}K`;
  }

  return tokens.toLocaleString();
}

/**
 * Formats price in USD per 1M tokens with appropriate decimal precision
 */
export function formatPrice(amount: string | number | null | undefined): string {
  if (amount == null || amount === "") return "—";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "—";
  if (num === 0) return "Free";

  if (num < 0.01) {
    return `$${num.toFixed(4)}`;
  }
  if (num < 1) {
    return `$${num.toFixed(3)}`;
  }
  return `$${num.toFixed(2)}`;
}

/**
 * Formats date string into human-readable month and year (e.g. "May 2024")
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}
