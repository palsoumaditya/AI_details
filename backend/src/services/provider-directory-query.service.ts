import { prisma, PrismaClient, Prisma } from "../database/index";
import type {
  ProviderDirectoryItemDto,
  ProviderEndpointItemDto,
  ProviderDetailResult,
  ProviderDirectoryResult,
  PaginationMeta,
} from "../shared/types/api";
import {
  ProvidersQuerySchema,
  ProvidersInputQuery,
  ProvidersQuery,
  ProviderEndpointsQuerySchema,
  ProviderEndpointsInputQuery,
  ProviderEndpointsQuery,
  ProviderSlugParamSchema,
} from "../shared/schemas/api";
import type { IProvidersQueryService } from "./contracts/index";

/**
 * Provider Directory Query Service (Phase 4D)
 *
 * Implements high-performance catalog discovery, multi-modality aggregations,
 * provider-type filtering, and nested endpoint matrix queries for inference providers.
 */
export class ProviderDirectoryQueryService implements IProvidersQueryService {
  constructor(private readonly db: PrismaClient = prisma) {}

  /**
   * Retrieve paginated directory of registered inference providers
   */
  async listProviders(inputParams?: ProvidersInputQuery): Promise<ProviderDirectoryResult> {
    const query: ProvidersQuery = ProvidersQuerySchema.parse(inputParams ?? {});

    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    // 1. Build relational WHERE filter
    const where: Prisma.ProviderWhereInput = {};

    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: "insensitive" } },
        { slug: { contains: query.q, mode: "insensitive" } },
      ];
    }

    if (query.providerType) {
      where.providerType = query.providerType as Prisma.EnumProviderTypeFilter;
    }

    if (query.hasEndpoints !== undefined) {
      where.endpoints = query.hasEndpoints ? { some: {} } : { none: {} };
    }

    if (query.hasOnlineEndpoints !== undefined) {
      where.endpoints = query.hasOnlineEndpoints
        ? { some: { status: "ONLINE" } }
        : { none: { status: "ONLINE" } };
    }

    // 2. Build deterministic sorting
    let orderBy: Prisma.ProviderOrderByWithRelationInput[];
    switch (query.sort) {
      case "name_desc":
        orderBy = [{ name: "desc" }, { id: "desc" }];
        break;
      case "endpoints_desc":
      case "models_desc":
        orderBy = [{ endpoints: { _count: "desc" } }, { name: "asc" }, { id: "desc" }];
        break;
      case "name_asc":
      default:
        orderBy = [{ name: "asc" }, { id: "desc" }];
        break;
    }

    // 3. Execute total count and paginated provider query in parallel
    const [totalItems, providers] = await Promise.all([
      this.db.provider.count({ where }),
      this.db.provider.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          website: true,
          logoUrl: true,
          providerType: true,
        },
      }),
    ]);

    // 4. Batch fetch endpoint configurations for the current page to avoid N+1
    const providerIds = providers.map((p) => p.id);
    const endpointRows =
      providerIds.length > 0
        ? await this.db.modelProviderEndpoint.findMany({
            where: { providerId: { in: providerIds } },
            select: {
              providerId: true,
              modelId: true,
              status: true,
              inputModalities: true,
              outputModalities: true,
              lastSeenAt: true,
            },
          })
        : [];

    // Group endpoint metrics by providerId
    const endpointsByProvider = new Map<string, typeof endpointRows>();
    for (const ep of endpointRows) {
      const list = endpointsByProvider.get(ep.providerId) ?? [];
      list.push(ep);
      endpointsByProvider.set(ep.providerId, list);
    }

    // 5. Transform providers into explicit DTOs with verified distinct aggregates
    const items: ProviderDirectoryItemDto[] = providers.map((p) => {
      const eps = endpointsByProvider.get(p.id) ?? [];
      const distinctModelIds = new Set(eps.map((e) => e.modelId));
      const onlineModelIds = new Set(
        eps.filter((e) => e.status === "ONLINE").map((e) => e.modelId)
      );

      const inputModalitiesSet = new Set<string>();
      const outputModalitiesSet = new Set<string>();
      let maxLastSeen: Date | null = null;
      let onlineCount = 0;
      let offlineCount = 0;
      let unknownCount = 0;

      for (const ep of eps) {
        if (ep.status === "ONLINE") onlineCount++;
        else if (ep.status === "OFFLINE") offlineCount++;
        else unknownCount++;

        for (const m of ep.inputModalities) inputModalitiesSet.add(m);
        for (const m of ep.outputModalities) outputModalitiesSet.add(m);

        if (ep.lastSeenAt) {
          if (!maxLastSeen || ep.lastSeenAt > maxLastSeen) {
            maxLastSeen = ep.lastSeenAt;
          }
        }
      }

      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        description: p.description,
        website: p.website,
        logoUrl: p.logoUrl,
        providerType: p.providerType,
        endpointCount: eps.length,
        onlineEndpointCount: onlineCount,
        offlineEndpointCount: offlineCount,
        unknownEndpointCount: unknownCount,
        modelCount: distinctModelIds.size,
        onlineModelCount: onlineModelIds.size,
        supportedInputModalities: Array.from(inputModalitiesSet).sort(),
        supportedOutputModalities: Array.from(outputModalitiesSet).sort(),
        lastSeenAt: maxLastSeen ? maxLastSeen.toISOString() : null,
      };
    });

    const totalPages = Math.ceil(totalItems / limit);
    const pagination: PaginationMeta = {
      page,
      limit,
      total: totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };

    return {
      providers: items,
      pagination,
      appliedFilters: {
        q: query.q,
        providerType: query.providerType,
        hasEndpoints: query.hasEndpoints,
        hasOnlineEndpoints: query.hasOnlineEndpoints,
        sort: query.sort,
        page,
        limit,
      },
    };
  }

  /**
   * Retrieve single provider details with paginated endpoint matrix
   */
  async getProviderBySlug(
    slug: string,
    endpointQuery?: ProviderEndpointsInputQuery
  ): Promise<ProviderDetailResult | null> {
    const slugValidation = ProviderSlugParamSchema.safeParse({ slug });
    if (!slugValidation.success) {
      return null;
    }

    const canonicalSlug = slugValidation.data.slug;
    const query: ProviderEndpointsQuery = ProviderEndpointsQuerySchema.parse(
      endpointQuery ?? {}
    );

    // 1. Find provider record
    const provider = await this.db.provider.findUnique({
      where: { slug: canonicalSlug },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        website: true,
        logoUrl: true,
        providerType: true,
      },
    });

    if (!provider) {
      return null;
    }

    // 2. Fetch full endpoint set for this provider to compute global provider summary
    const allEndpoints = await this.db.modelProviderEndpoint.findMany({
      where: { providerId: provider.id },
      select: {
        modelId: true,
        status: true,
        inputModalities: true,
        outputModalities: true,
        lastSeenAt: true,
      },
    });

    const distinctModelIds = new Set(allEndpoints.map((e) => e.modelId));
    const onlineModelIds = new Set(
      allEndpoints.filter((e) => e.status === "ONLINE").map((e) => e.modelId)
    );
    const inputModalitiesSet = new Set<string>();
    const outputModalitiesSet = new Set<string>();
    let maxLastSeen: Date | null = null;
    let onlineCount = 0;
    let offlineCount = 0;
    let unknownCount = 0;

    for (const ep of allEndpoints) {
      if (ep.status === "ONLINE") onlineCount++;
      else if (ep.status === "OFFLINE") offlineCount++;
      else unknownCount++;

      for (const m of ep.inputModalities) inputModalitiesSet.add(m);
      for (const m of ep.outputModalities) outputModalitiesSet.add(m);

      if (ep.lastSeenAt) {
        if (!maxLastSeen || ep.lastSeenAt > maxLastSeen) {
          maxLastSeen = ep.lastSeenAt;
        }
      }
    }

    const providerSummary: ProviderDirectoryItemDto = {
      id: provider.id,
      slug: provider.slug,
      name: provider.name,
      description: provider.description,
      website: provider.website,
      logoUrl: provider.logoUrl,
      providerType: provider.providerType,
      endpointCount: allEndpoints.length,
      onlineEndpointCount: onlineCount,
      offlineEndpointCount: offlineCount,
      unknownEndpointCount: unknownCount,
      modelCount: distinctModelIds.size,
      onlineModelCount: onlineModelIds.size,
      supportedInputModalities: Array.from(inputModalitiesSet).sort(),
      supportedOutputModalities: Array.from(outputModalitiesSet).sort(),
      lastSeenAt: maxLastSeen ? maxLastSeen.toISOString() : null,
    };

    // 3. Paginate nested endpoints with filters
    const endpointWhere: Prisma.ModelProviderEndpointWhereInput = {
      providerId: provider.id,
      ...(query.status ? { status: query.status as Prisma.EnumEndpointStatusFilter } : {}),
      ...(query.inputModality
        ? { inputModalities: { has: query.inputModality } }
        : {}),
      ...(query.outputModality
        ? { outputModalities: { has: query.outputModality } }
        : {}),
    };

    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    const [totalItems, endpointRows] = await Promise.all([
      this.db.modelProviderEndpoint.count({ where: endpointWhere }),
      this.db.modelProviderEndpoint.findMany({
        where: endpointWhere,
        skip,
        take: limit,
        orderBy: [{ lastSeenAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          endpointKey: true,
          name: true,
          status: true,
          contextWindow: true,
          maxOutputTokens: true,
          inputModalities: true,
          outputModalities: true,
          capabilities: true,
          isModerated: true,
          lastSeenAt: true,
          model: {
            select: {
              id: true,
              slug: true,
              name: true,
              family: true,
            },
          },
        },
      }),
    ]);

    const endpointItems: ProviderEndpointItemDto[] = endpointRows.map((ep) => ({
      id: ep.id,
      endpointKey: ep.endpointKey,
      name: ep.name,
      status: ep.status,
      model: {
        id: ep.model.id,
        slug: ep.model.slug,
        name: ep.model.name,
        family: ep.model.family,
      },
      contextWindow: ep.contextWindow,
      maxOutputTokens: ep.maxOutputTokens,
      inputModalities: ep.inputModalities,
      outputModalities: ep.outputModalities,
      capabilities: (ep.capabilities as Record<string, unknown>) ?? null,
      isModerated: ep.isModerated,
      lastSeenAt: ep.lastSeenAt ? ep.lastSeenAt.toISOString() : null,
    }));

    const totalPages = Math.ceil(totalItems / limit);
    const pagination: PaginationMeta = {
      page,
      limit,
      total: totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };

    return {
      provider: providerSummary,
      endpoints: endpointItems,
      pagination,
      appliedFilters: {
        slug: canonicalSlug,
        status: query.status,
        inputModality: query.inputModality,
        outputModality: query.outputModality,
        page,
        limit,
      },
    };
  }
}

export const providerDirectoryQueryService = new ProviderDirectoryQueryService();
