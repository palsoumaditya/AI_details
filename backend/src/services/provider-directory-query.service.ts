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
import { cacheService } from "./cache.service";

/**
 * Service for querying inference providers and their deployed endpoint catalog.
 *
 * Implements catalog discovery, multi-modality aggregations, provider-type filtering,
 * endpoint health and status aggregations, and nested endpoint matrix queries.
 */
export class ProviderDirectoryQueryService implements IProvidersQueryService {
  constructor(private readonly db: PrismaClient = prisma) {}

  /**
   * Retrieves a paginated directory of registered inference providers with aggregated endpoint metrics.
   *
   * Executes parameterized search, provider-type filtering, status checks, and calculates
   * supported input/output modalities dynamically using PostgreSQL array aggregations.
   *
   * @param inputParams - Optional search query, provider type, endpoint presence filters, sort order, and pagination.
   * @returns Paginated provider summary list with pagination metadata.
   */
  async listProviders(inputParams?: ProvidersInputQuery): Promise<ProviderDirectoryResult> {
    const query: ProvidersQuery = ProvidersQuerySchema.parse(inputParams ?? {});
    const cacheKey = JSON.stringify(query);

    return cacheService.getOrSet(
      "providers",
      cacheKey,
      async () => {
        const page = query.page;
        const limit = query.limit;
        const skip = (page - 1) * limit;

        const conditions: Prisma.Sql[] = [];

        if (query.q) {
          const searchPattern = `%${query.q}%`;
          conditions.push(Prisma.sql`(p."name" ILIKE ${searchPattern} OR p."slug" ILIKE ${searchPattern})`);
        }

        if (query.providerType) {
          conditions.push(Prisma.sql`p."providerType" = ${query.providerType}::"ProviderType"`);
        }

        if (query.hasEndpoints !== undefined) {
          if (query.hasEndpoints) {
            conditions.push(Prisma.sql`EXISTS (SELECT 1 FROM "model_provider_endpoints" e WHERE e."providerId" = p."id")`);
          } else {
            conditions.push(Prisma.sql`NOT EXISTS (SELECT 1 FROM "model_provider_endpoints" e WHERE e."providerId" = p."id")`);
          }
        }

        if (query.hasOnlineEndpoints !== undefined) {
          if (query.hasOnlineEndpoints) {
            conditions.push(Prisma.sql`EXISTS (SELECT 1 FROM "model_provider_endpoints" e WHERE e."providerId" = p."id" AND e."status" = 'ONLINE')`);
          } else {
            conditions.push(Prisma.sql`NOT EXISTS (SELECT 1 FROM "model_provider_endpoints" e WHERE e."providerId" = p."id" AND e."status" = 'ONLINE')`);
          }
        }

        const whereClause = conditions.length > 0
          ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
          : Prisma.empty;

        let orderByClause: Prisma.Sql;
        switch (query.sort) {
          case "name_desc":
            orderByClause = Prisma.sql`ORDER BY p."name" DESC, p."id" DESC`;
            break;
          case "endpoints_desc":
            orderByClause = Prisma.sql`ORDER BY COUNT(e."id") DESC, p."name" ASC, p."id" DESC`;
            break;
          case "models_desc":
            orderByClause = Prisma.sql`ORDER BY COUNT(DISTINCT e."modelId") DESC, p."name" ASC, p."id" DESC`;
            break;
          case "name_asc":
          default:
            orderByClause = Prisma.sql`ORDER BY p."name" ASC, p."id" DESC`;
            break;
        }

        // Query total count and aggregated provider metadata concurrently
        const [countRows, providerRows] = await Promise.all([
          this.db.$queryRaw<Array<{ count: number }>>(Prisma.sql`
            SELECT count(*)::int AS count
            FROM "providers" p
            ${whereClause}
          `),
          this.db.$queryRaw<Array<{
            id: string;
            slug: string;
            name: string;
            description: string | null;
            website: string | null;
            logoUrl: string | null;
            providerType: string;
            endpointCount: number;
            onlineEndpointCount: number;
            offlineEndpointCount: number;
            unknownEndpointCount: number;
            modelCount: number;
            onlineModelCount: number;
            lastSeenAt: Date | null;
            supportedInputModalities: string[];
            supportedOutputModalities: string[];
          }>>(Prisma.sql`
            SELECT 
              p."id",
              p."slug",
              p."name",
              p."description",
              p."website",
              p."logoUrl",
              p."providerType"::text AS "providerType",
              COUNT(e."id")::int AS "endpointCount",
              COUNT(CASE WHEN e."status" = 'ONLINE' THEN 1 END)::int AS "onlineEndpointCount",
              COUNT(CASE WHEN e."status" = 'OFFLINE' THEN 1 END)::int AS "offlineEndpointCount",
              COUNT(CASE WHEN e."status" NOT IN ('ONLINE', 'OFFLINE') THEN 1 END)::int AS "unknownEndpointCount",
              COUNT(DISTINCT e."modelId")::int AS "modelCount",
              COUNT(DISTINCT CASE WHEN e."status" = 'ONLINE' THEN e."modelId" END)::int AS "onlineModelCount",
              MAX(e."lastSeenAt") AS "lastSeenAt",
              COALESCE((
                SELECT array_agg(DISTINCT elem ORDER BY elem)
                FROM "model_provider_endpoints" ep, unnest(ep."inputModalities") elem
                WHERE ep."providerId" = p."id"
              ), ARRAY[]::text[]) AS "supportedInputModalities",
              COALESCE((
                SELECT array_agg(DISTINCT elem ORDER BY elem)
                FROM "model_provider_endpoints" ep, unnest(ep."outputModalities") elem
                WHERE ep."providerId" = p."id"
              ), ARRAY[]::text[]) AS "supportedOutputModalities"
            FROM "providers" p
            LEFT JOIN "model_provider_endpoints" e ON p."id" = e."providerId"
            ${whereClause}
            GROUP BY p."id"
            ${orderByClause}
            LIMIT ${limit} OFFSET ${skip}
          `),
        ]);

        const totalItems = countRows[0]?.count ?? 0;

        const items: ProviderDirectoryItemDto[] = providerRows.map((r) => ({
          id: r.id,
          slug: r.slug,
          name: r.name,
          description: r.description,
          website: r.website,
          logoUrl: r.logoUrl,
          providerType: r.providerType,
          endpointCount: Number(r.endpointCount),
          onlineEndpointCount: Number(r.onlineEndpointCount),
          offlineEndpointCount: Number(r.offlineEndpointCount),
          unknownEndpointCount: Number(r.unknownEndpointCount),
          modelCount: Number(r.modelCount),
          onlineModelCount: Number(r.onlineModelCount),
          supportedInputModalities: r.supportedInputModalities ?? [],
          supportedOutputModalities: r.supportedOutputModalities ?? [],
          lastSeenAt: r.lastSeenAt ? new Date(r.lastSeenAt).toISOString() : null,
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
      },
      120
    );
  }

  /**
   * Retrieves single provider details with aggregated metrics and a paginated list of deployed endpoints.
   *
   * @param slug - Canonical provider slug identifier.
   * @param endpointQuery - Optional endpoint filters (status, modality) and pagination parameters.
   * @returns Detailed provider result or null if the provider does not exist.
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
    const cacheKey = `${canonicalSlug}:${JSON.stringify(query)}`;

    return cacheService.getOrSet(
      "providers",
      cacheKey,
      async () => {
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

        // Aggregate endpoint counts and supported modalities for the requested provider
        const summaryRows = await this.db.$queryRaw<Array<{
          endpointCount: number;
          onlineEndpointCount: number;
          offlineEndpointCount: number;
          unknownEndpointCount: number;
          modelCount: number;
          onlineModelCount: number;
          lastSeenAt: Date | null;
          supportedInputModalities: string[];
          supportedOutputModalities: string[];
        }>>(Prisma.sql`
          SELECT 
            COUNT(e."id")::int AS "endpointCount",
            COUNT(CASE WHEN e."status" = 'ONLINE' THEN 1 END)::int AS "onlineEndpointCount",
            COUNT(CASE WHEN e."status" = 'OFFLINE' THEN 1 END)::int AS "offlineEndpointCount",
            COUNT(CASE WHEN e."status" NOT IN ('ONLINE', 'OFFLINE') THEN 1 END)::int AS "unknownEndpointCount",
            COUNT(DISTINCT e."modelId")::int AS "modelCount",
            COUNT(DISTINCT CASE WHEN e."status" = 'ONLINE' THEN e."modelId" END)::int AS "onlineModelCount",
            MAX(e."lastSeenAt") AS "lastSeenAt",
            COALESCE((
              SELECT array_agg(DISTINCT elem ORDER BY elem)
              FROM "model_provider_endpoints" ep, unnest(ep."inputModalities") elem
              WHERE ep."providerId" = ${provider.id}
            ), ARRAY[]::text[]) AS "supportedInputModalities",
            COALESCE((
              SELECT array_agg(DISTINCT elem ORDER BY elem)
              FROM "model_provider_endpoints" ep, unnest(ep."outputModalities") elem
              WHERE ep."providerId" = ${provider.id}
            ), ARRAY[]::text[]) AS "supportedOutputModalities"
          FROM "model_provider_endpoints" e
          WHERE e."providerId" = ${provider.id}
        `);

        const summary = summaryRows[0] ?? {
          endpointCount: 0,
          onlineEndpointCount: 0,
          offlineEndpointCount: 0,
          unknownEndpointCount: 0,
          modelCount: 0,
          onlineModelCount: 0,
          lastSeenAt: null,
          supportedInputModalities: [],
          supportedOutputModalities: [],
        };

        const providerSummary: ProviderDirectoryItemDto = {
          id: provider.id,
          slug: provider.slug,
          name: provider.name,
          description: provider.description,
          website: provider.website,
          logoUrl: provider.logoUrl,
          providerType: provider.providerType,
          endpointCount: Number(summary.endpointCount),
          onlineEndpointCount: Number(summary.onlineEndpointCount),
          offlineEndpointCount: Number(summary.offlineEndpointCount),
          unknownEndpointCount: Number(summary.unknownEndpointCount),
          modelCount: Number(summary.modelCount),
          onlineModelCount: Number(summary.onlineModelCount),
          supportedInputModalities: summary.supportedInputModalities ?? [],
          supportedOutputModalities: summary.supportedOutputModalities ?? [],
          lastSeenAt: summary.lastSeenAt ? new Date(summary.lastSeenAt).toISOString() : null,
        };

        // Query paginated endpoints matching requested filter criteria
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
            orderBy: [{ lastSeenAt: { sort: "desc", nulls: "last" } }, { id: "desc" }],
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
      },
      120
    );
  }
}

export const providerDirectoryQueryService = new ProviderDirectoryQueryService();
