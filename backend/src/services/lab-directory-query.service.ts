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

/**
 * AI Lab Directory Query Service (Phase 4D)
 *
 * Implements research organization discovery, verified foundation model lineages,
 * role-specific association counts, and model family distributions.
 */
export class LabDirectoryQueryService implements ILabsQueryService {
  constructor(private readonly db: PrismaClient = prisma) {}

  /**
   * Retrieve paginated directory of registered AI research labs
   */
  async listLabs(inputParams?: LabsInputQuery): Promise<AiLabDirectoryResult> {
    const query: LabsQuery = LabsQuerySchema.parse(inputParams ?? {});

    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    // 1. Build relational WHERE filter
    const where: Prisma.AiLabWhereInput = {};

    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: "insensitive" } },
        { slug: { contains: query.q, mode: "insensitive" } },
      ];
    }

    if (query.country) {
      where.country = { equals: query.country, mode: "insensitive" };
    }

    // 2. Build deterministic sorting
    let orderBy: Prisma.AiLabOrderByWithRelationInput[];
    switch (query.sort) {
      case "name_desc":
        orderBy = [{ name: "desc" }, { id: "desc" }];
        break;
      case "models_desc":
        orderBy = [{ models: { _count: "desc" } }, { name: "asc" }, { id: "desc" }];
        break;
      case "name_asc":
      default:
        orderBy = [{ name: "asc" }, { id: "desc" }];
        break;
    }

    // 3. Execute total count and paginated labs query in parallel
    const [totalItems, labs] = await Promise.all([
      this.db.aiLab.count({ where }),
      this.db.aiLab.findMany({
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
          country: true,
        },
      }),
    ]);

    // 4. Batch fetch model_labs associations for current page to prevent N+1
    const labIds = labs.map((l) => l.id);
    const linkRows =
      labIds.length > 0
        ? await this.db.modelLab.findMany({
            where: { aiLabId: { in: labIds } },
            select: {
              aiLabId: true,
              modelId: true,
              relationshipType: true,
            },
          })
        : [];

    const linksByLab = new Map<string, typeof linkRows>();
    for (const link of linkRows) {
      const list = linksByLab.get(link.aiLabId) ?? [];
      list.push(link);
      linksByLab.set(link.aiLabId, list);
    }

    // 5. Transform into DTOs with verified distinct aggregates
    const items: AiLabDirectoryItemDto[] = labs.map((l) => {
      const links = linksByLab.get(l.id) ?? [];
      const distinctModelIds = new Set(links.map((link) => link.modelId));
      const creatorModelIds = new Set(
        links.filter((link) => link.relationshipType === "CREATOR").map((link) => link.modelId)
      );
      const publisherModelIds = new Set(
        links.filter((link) => link.relationshipType === "PUBLISHER").map((link) => link.modelId)
      );
      const collaboratorModelIds = new Set(
        links.filter((link) => link.relationshipType === "COLLABORATOR").map((link) => link.modelId)
      );

      return {
        id: l.id,
        slug: l.slug,
        name: l.name,
        description: l.description,
        website: l.website,
        logoUrl: l.logoUrl,
        country: l.country,
        modelCount: distinctModelIds.size,
        creatorModelCount: creatorModelIds.size,
        publisherModelCount: publisherModelIds.size,
        collaboratorModelCount: collaboratorModelIds.size,
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
  }

  /**
   * Retrieve single AI Lab details with family distribution and paginated models
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

    // 1. Find AI Lab record
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

    // 2. Fetch full association set for this lab to calculate lab metrics and family distribution
    const allLinks = await this.db.modelLab.findMany({
      where: { aiLabId: lab.id },
      select: {
        modelId: true,
        relationshipType: true,
        model: {
          select: {
            id: true,
            family: true,
          },
        },
      },
    });

    const distinctModelIds = new Set(allLinks.map((link) => link.modelId));
    const creatorModelIds = new Set(
      allLinks.filter((link) => link.relationshipType === "CREATOR").map((link) => link.modelId)
    );
    const publisherModelIds = new Set(
      allLinks.filter((link) => link.relationshipType === "PUBLISHER").map((link) => link.modelId)
    );
    const collaboratorModelIds = new Set(
      allLinks.filter((link) => link.relationshipType === "COLLABORATOR").map((link) => link.modelId)
    );

    const labSummary: AiLabDirectoryItemDto = {
      id: lab.id,
      slug: lab.slug,
      name: lab.name,
      description: lab.description,
      website: lab.website,
      logoUrl: lab.logoUrl,
      country: lab.country,
      modelCount: distinctModelIds.size,
      creatorModelCount: creatorModelIds.size,
      publisherModelCount: publisherModelIds.size,
      collaboratorModelCount: collaboratorModelIds.size,
    };

    // Calculate family distribution across distinct canonical models
    const distinctModelFamilyMap = new Map<string, string | null>();
    for (const link of allLinks) {
      if (!distinctModelFamilyMap.has(link.model.id)) {
        distinctModelFamilyMap.set(link.model.id, link.model.family);
      }
    }

    const familyCounts = new Map<string | null, number>();
    for (const family of distinctModelFamilyMap.values()) {
      familyCounts.set(family, (familyCounts.get(family) ?? 0) + 1);
    }

    const familyDistribution: FamilyDistributionItemDto[] = Array.from(familyCounts.entries())
      .map(([family, modelCount]) => ({ family, modelCount }))
      .sort((a, b) => b.modelCount - a.modelCount);

    // 3. Paginate distinct canonical models associated with this lab
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

    const modelItems: AiLabModelItemDto[] = modelRows.map((m) => ({
      id: m.id,
      slug: m.slug,
      name: m.name,
      family: m.family,
      releaseDate: m.releaseDate ? m.releaseDate.toISOString() : null,
      status: m.status,
      isReasoning: m.isReasoning,
      isOpenWeight: m.isOpenWeight,
      relationshipTypes: m.labs.map((l) => l.relationshipType),
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
  }
}

export const labDirectoryQueryService = new LabDirectoryQueryService();
