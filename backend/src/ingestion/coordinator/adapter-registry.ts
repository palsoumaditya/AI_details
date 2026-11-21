import type { IngestionSourceAdapter } from "../contracts/types";

export class AdapterRegistry {
  private readonly adapters = new Map<string, IngestionSourceAdapter>();

  /**
   * Registers a source adapter instance.
   */
  register(adapter: IngestionSourceAdapter): void {
    const slug = adapter.sourceSlug.toLowerCase();
    if (this.adapters.has(slug)) {
      throw new Error(`Ingestion adapter for source '${slug}' is already registered.`);
    }
    this.adapters.set(slug, adapter);
  }

  /**
   * Returns a registered adapter by source slug.
   */
  get(sourceSlug: string): IngestionSourceAdapter {
    const adapter = this.adapters.get(sourceSlug.toLowerCase());
    if (!adapter) {
      throw new Error(`No ingestion adapter registered for source '${sourceSlug}'. Available: [${this.getAvailableSlugs().join(", ")}]`);
    }
    return adapter;
  }

  /**
   * Checks if an adapter is registered.
   */
  has(sourceSlug: string): boolean {
    return this.adapters.has(sourceSlug.toLowerCase());
  }

  /**
   * Returns all registered adapters.
   */
  getAll(): IngestionSourceAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Returns list of available source slugs.
   */
  getAvailableSlugs(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Validates and returns requested adapters.
   */
  getRequestedAdapters(sourceSlugs: string[]): IngestionSourceAdapter[] {
    if (sourceSlugs.length === 0) {
      return this.getAll();
    }
    return sourceSlugs.map((slug) => this.get(slug));
  }
}
