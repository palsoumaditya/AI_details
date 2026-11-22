import { prisma, PrismaClient, Prisma } from "../database/index";
import type {
  AiLabDirectoryItemDto,
  AiLabModelItemDto,
  FamilyDistributionItemDto,
  AiLabDetailResult,
  AiLabDirectoryResult,
  PaginationMeta,
} from "../shared/types/api";
import {
  LabsQuerySchema,
  LabsInputQuery,
  LabsQuery,
  LabModelsQuerySchema,
  LabModelsInputQuery,
  LabModelsQuery,
  LabSlugParamSchema,
} from "../shared/schemas/api";
import type { ILabsQueryService } from "./contracts/index";
import { cacheService } from "./cache.service";

/**
 * Service for querying AI research organizations and their model portfolios.
 *
 * Provides research organization discovery, verified foundation model lineages,
 * role-specific association counts (CREATOR, PUBLISHER, COLLABORATOR), and model family
 * distributions aggregated directly in PostgreSQL.
 */
export class LabDirectoryQueryService implements ILabsQueryService {
  constructor(private readonly db: PrismaClient = prisma) {}

  /**
   * Retrieves a paginated directory of registered AI research labs with aggregated metrics.
   *
   * Executes parameterized search, country filtering, deterministic ordering, and concurrent
   * counts for distinct models and organizational roles.
   *
   * @param inputParams - Optional search query, country filter, sort order, and pagination parameters.
   * @returns Paginated list of AI lab summary DTOs and pagination metadata.
   */
  async listLabs(inputParams?: LabsInputQuery): Promise<AiLabDirectoryResult> {
    const query: LabsQuery = LabsQuerySchema.parse(inputParams ?? {});
    const cacheKey = JSON.stringify(query);

    return cacheService.getOrSet(
      "labs",
      cacheKey,
      async () => {
        const page = query.page;
        const limit = query.limit;
        const skip = (page - 1) * limit;

        const conditions: Prisma.Sql[] = [];

        if (query.q) {
          const searchPattern = `%${query.q}%`;
          conditions.push(Prisma.sql`(l."name" ILIKE ${searchPattern} OR l."slug" ILIKE ${searchPattern})`);
        }

        if (query.country) {
          conditions.push(Prisma.sql`l."country" ILIKE ${query.country}`);
        }

        const whereClause = conditions.length > 0
          ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
          : Prisma.empty;

        let orderByClause: Prisma.Sql;
        switch (query.sort) {
          case "name_desc":
            orderByClause = Prisma.sql`ORDER BY l."name" DESC, l."id" DESC`;
            break;
          case "models_desc":
            orderByClause = Prisma.sql`ORDER BY COUNT(DISTINCT ml."modelId") DESC, l."name" ASC, l."id" DESC`;
            break;
          case "name_asc":
          default:
            orderByClause = Prisma.sql`ORDER BY l."name" ASC, l."id" DESC`;
            break;
        }

        // Execute count and paginated aggregation in parallel to avoid multiple round-trips
        const [countRows, labRows] = await Promise.all([
          this.db.$queryRaw<Array<{ count: number }>>(Prisma.sql`
            SELECT count(*)::int AS count
            FROM "ai_labs" l
            ${whereClause}
          `),
          this.db.$queryRaw<Array<{
            id: string;
            slug: string;
            name: string;
            description: string | null;
            website: string | null;
            logoUrl: string | null;
            country: string | null;
            modelCount: number;
            creatorModelCount: number;
            publisherModelCount: number;
            collaboratorModelCount: number;
          }>>(Prisma.sql`
            SELECT 
              l."id",
              l."slug",
              l."name",
              l."description",
              l."website",
              l."logoUrl",
              l."country",
              COUNT(DISTINCT ml."modelId")::int AS "modelCount",
              COUNT(DISTINCT CASE WHEN ml."relationshipType" = 'CREATOR' THEN ml."modelId" END)::int AS "creatorModelCount",
              COUNT(DISTINCT CASE WHEN ml."relationshipType" = 'PUBLISHER' THEN ml."modelId" END)::int AS "publisherModelCount",
              COUNT(DISTINCT CASE WHEN ml."relationshipType" = 'COLLABORATOR' THEN ml."modelId" END)::int AS "collaboratorModelCount"
            FROM "ai_labs" l
            LEFT JOIN "model_labs" ml ON l."id" = ml."aiLabId"
            ${whereClause}
            GROUP BY l."id"
            ${orderByClause}
            LIMIT ${limit} OFFSET ${skip}
          `),
        ]);

        const totalItems = countRows[0]?.count ?? 0;

        const items: AiLabDirectoryItemDto[] = labRows.map((r) => ({
          id: r.id,
          slug: r.slug,
          name: r.name,
          description: r.description,
          website: r.website,
          logoUrl: r.logoUrl,
          country: r.country,
          modelCount: Number(r.modelCount),
          creatorModelCount: Number(r.creatorModelCount),
          publisherModelCount: Number(r.publisherModelCount),
          collaboratorModelCount: Number(r.collaboratorModelCount),
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
          labs: items,
          pagination,
          appliedFilters: {
            q: query.q,
            country: query.country,
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
   * Retrieves comprehensive AI lab profile by slug, including model family breakdown and associated models.
   *
   * @param slug - Canonical lab slug identifier.
   * @param modelQuery - Optional filters for relationship type, family, and pagination.
   * @returns Detailed lab profile result or null if not found.
   */
  async getLabBySlug(
    slug: string,
    modelQuery?: LabModelsInputQuery
  ): Promise<AiLabDetailResult | null> {
    const slugValidation = LabSlugParamSchema.safeParse({ slug });
    if (!slugValidation.success) {
      return null;
    }

    const canonicalSlug = slugValidation.data.slug;
    const query: LabModelsQuery = LabModelsQuerySchema.parse(modelQuery ?? {});
    const cacheKey = `${canonicalSlug}:${JSON.stringify(query)}`;

    return cacheService.getOrSet(
      "labs",
      cacheKey,
      async () => {
        const lab = await this.db.aiLab.findUnique({
          where: { slug: canonicalSlug },
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            website: true,
            logoUrl: true,
            country: true,
          },
        });

        if (!lab) {
          return null;
        }

        // Aggregate overall model role counts and distinct family distributions concurrently
        const [labSummaryRows, familyRows] = await Promise.all([
          this.db.$queryRaw<Array<{
            modelCount: number;
            creatorModelCount: number;
            publisherModelCount: number;
            collaboratorModelCount: number;
          }>>(Prisma.sql`
            SELECT 
              COUNT(DISTINCT ml."modelId")::int AS "modelCount",
              COUNT(DISTINCT CASE WHEN ml."relationshipType" = 'CREATOR' THEN ml."modelId" END)::int AS "creatorModelCount",
              COUNT(DISTINCT CASE WHEN ml."relationshipType" = 'PUBLISHER' THEN ml."modelId" END)::int AS "publisherModelCount",
              COUNT(DISTINCT CASE WHEN ml."relationshipType" = 'COLLABORATOR' THEN ml."modelId" END)::int AS "collaboratorModelCount"
            FROM "model_labs" ml
            WHERE ml."aiLabId" = ${lab.id}
          `),
          this.db.$queryRaw<Array<{
            family: string | null;
            modelCount: number;
          }>>(Prisma.sql`
            SELECT 
              m."family",
              COUNT(DISTINCT m."id")::int AS "modelCount"
            FROM "models" m
            JOIN "model_labs" ml ON m."id" = ml."modelId"
            WHERE ml."aiLabId" = ${lab.id}
            GROUP BY m."family"
            ORDER BY "modelCount" DESC, m."family" ASC NULLS LAST
          `),
        ]);

        const summary = labSummaryRows[0] ?? {
          modelCount: 0,
          creatorModelCount: 0,
          publisherModelCount: 0,
          collaboratorModelCount: 0,
        };

        const labSummary: AiLabDirectoryItemDto = {
          id: lab.id,
          slug: lab.slug,
          name: lab.name,
          description: lab.description,
          website: lab.website,
          logoUrl: lab.logoUrl,
          country: lab.country,
          modelCount: Number(summary.modelCount),
          creatorModelCount: Number(summary.creatorModelCount),
          publisherModelCount: Number(summary.publisherModelCount),
          collaboratorModelCount: Number(summary.collaboratorModelCount),
        };

        const familyDistribution: FamilyDistributionItemDto[] = familyRows.map((f) => ({
          family: f.family,
          modelCount: Number(f.modelCount),
        }));

        // Retrieve paginated list of canonical models linked to this organization
        const modelWhere: Prisma.ModelWhereInput = {
          labs: {
            some: {
              aiLabId: lab.id,
              ...(query.relationshipType
                ? { relationshipType: query.relationshipType as Prisma.EnumLabRoleFilter }
                : {}),
            },
          },
          ...(query.family !== undefined ? { family: query.family } : {}),
        };

        const page = query.page;
        const limit = query.limit;
        const skip = (page - 1) * limit;

        const [totalItems, modelRows] = await Promise.all([
          this.db.model.count({ where: modelWhere }),
          this.db.model.findMany({
            where: modelWhere,
            skip,
            take: limit,
            orderBy: [{ releaseDate: { sort: "desc", nulls: "last" } }, { id: "desc" }],
            select: {
              id: true,
              slug: true,
              name: true,
              family: true,
              releaseDate: true,
              status: true,
              isReasoning: true,
              isOpenWeight: true,
              labs: {
                where: { aiLabId: lab.id },
                select: { relationshipType: true },
              },
            },
          }),
        ]);

        const modelItems: AiLabModelItemDto[] = modelRows.map((m) => {
          const distinctRoles = Array.from(new Set(m.labs.map((l) => l.relationshipType)));
          return {
            id: m.id,
            slug: m.slug,
            name: m.name,
            family: m.family,
            releaseDate: m.releaseDate ? m.releaseDate.toISOString() : null,
            status: m.status,
            isReasoning: m.isReasoning,
            isOpenWeight: m.isOpenWeight,
            relationshipTypes: distinctRoles,
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
          lab: labSummary,
          familyDistribution,
          models: modelItems,
          pagination,
          appliedFilters: {
            slug: canonicalSlug,
            relationshipType: query.relationshipType,
            family: query.family,
            page,
            limit,
          },
        };
      },
      120
    );
  }
}

export const labDirectoryQueryService = new LabDirectoryQueryService();
