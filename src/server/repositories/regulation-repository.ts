import type { Prisma } from "../../generated/prisma/client";
import type { Db } from "../db";
import { regulationDto } from "../mappers";
import { querySchema, type Query } from "../validation";
import { visibleWhere } from "../visibility";
export function dayRange(date = new Date()) {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  return { gte: start, lt: new Date(start.getTime() + 86400000) };
}
export function whereQuery(
  q: Query,
  now = new Date(),
): Prisma.RegulationWhereInput {
  const and: Prisma.RegulationWhereInput[] = [];
  if (q.q.trim()) {
    const term = q.q.trim();
    and.push({
      OR: [
        { title_original: { contains: term, mode: "insensitive" } },
        { title_zh: { contains: term, mode: "insensitive" } },
        { document_number: { contains: term, mode: "insensitive" } },
        { official_summary: { contains: term, mode: "insensitive" } },
        { content_text: { contains: term, mode: "insensitive" } },
        { keywords: { has: term } },
      ],
    });
  }
  if (q.regulator) and.push({ regulator: q.regulator });
  for (const key of [
    "categories",
    "subcategories",
    "product_types",
    "development_stages",
    "affected_departments",
  ] as const)
    if (q[key]) and.push({ [key]: { has: q[key] } });
  if (q.status) and.push({ status: q.status });
  if (q.document_type) and.push({ document_type: q.document_type });
  if (q.importance_level) and.push({ importance_level: q.importance_level });
  if (q.date || q.dateTo)
    and.push({
      publication_date: {
        ...(q.date ? { gte: new Date(q.date) } : {}),
        ...(q.dateTo ? { lte: new Date(q.dateTo) } : {}),
      },
    });
  if (q.change)
    and.push(q.change === "New" ? { is_new: true } : { is_updated: true });
  if (q.is_new !== undefined) and.push({ is_new: q.is_new });
  if (q.is_updated !== undefined) and.push({ is_updated: q.is_updated });
  if (q.today)
    and.push({
      OR: [
        { is_new: true, first_detected_at: dayRange(now) },
        {
          is_updated: true,
          versions: {
            some: {
              previous_version_id: { not: null },
              detected_at: dayRange(now),
            },
          },
        },
      ],
    });
  if (q.updates)
    and.push({
      OR: [
        { is_new: true },
        { is_updated: true },
        { versions: { some: { previous_version_id: { not: null } } } },
      ],
    });
  return visibleWhere({ AND: and });
}
export function regulationRepository(client: Db) {
  return {
    async getById(id: string) {
      const r = await client.regulation.findFirst({
        where: visibleWhere({ id }),
        include: {
          versions: { orderBy: [{ detected_at: "desc" }, { id: "asc" }] },
        },
      });
      return r ? regulationDto(r) : null;
    },
    async list(input: Partial<Query> = {}) {
      const q = querySchema.parse(input);
      const where = whereQuery(q);
      const orderBy: Prisma.RegulationOrderByWithRelationInput[] =
        q.sort === "Importance"
          ? [
              { importance_level: "asc" },
              { publication_date: { sort: "desc", nulls: "last" } },
              { id: "asc" },
            ]
          : q.sort === "Regulator"
            ? [
                { regulator: "asc" },
                { publication_date: { sort: "desc", nulls: "last" } },
                { id: "asc" },
              ]
            : q.sort === "Recently Updated"
              ? [{ updated_at: "desc" }, { id: "asc" }]
              : [
                  { publication_date: { sort: "desc", nulls: "last" } },
                  { id: "asc" },
                ];
      const [total, items] = await client.$transaction(
        [
          client.regulation.count({ where }),
          client.regulation.findMany({
            where,
            orderBy,
            skip: (q.page - 1) * q.pageSize,
            take: q.pageSize,
            include: {
              versions: {
                take: 2,
                orderBy: [{ detected_at: "desc" }, { id: "asc" }],
              },
            },
          }),
        ],
        { isolationLevel: "RepeatableRead" },
      );
      return {
        data: items.map(regulationDto),
        pagination: {
          page: q.page,
          pageSize: q.pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
        },
      };
    },
    async search(q: string, options: Partial<Query> = {}) {
      return this.list({ ...options, q });
    },
    async filter(options: Partial<Query>) {
      return this.list(options);
    },
    async count(options: Partial<Query> = {}) {
      return client.regulation.count({
        where: whereQuery(querySchema.parse(options)),
      });
    },
    async getRecent(limit = 6) {
      return this.list({
        sort: "Newest",
        pageSize: Math.min(100, Math.max(1, limit)),
      });
    },
    async getToday(options: Partial<Query> = {}) {
      return this.list({ ...options, today: true });
    },
    async getUpdated(options: Partial<Query> = {}) {
      return this.list({ ...options, updates: true });
    },
    async getHighPriority(limit = 6) {
      const rows = await client.regulation.findMany({
        where: visibleWhere({ importance_level: { in: ["CRITICAL", "HIGH"] } }),
        take: Math.min(100, Math.max(1, limit)),
        orderBy: [
          { importance_level: "asc" },
          { publication_date: { sort: "desc", nulls: "last" } },
          { id: "asc" },
        ],
        include: { versions: { take: 2, orderBy: { detected_at: "desc" } } },
      });
      return rows.map(regulationDto);
    },
    // Explicit trusted data-layer writes. No public or AI write endpoint is exposed.
    async create(data: Prisma.RegulationUncheckedCreateInput) {
      return client.regulation.create({ data });
    },
    async update(id: string, data: Prisma.RegulationUncheckedUpdateInput) {
      return client.regulation.update({ where: { id }, data });
    },
    async upsert(
      id: string,
      create: Prisma.RegulationUncheckedCreateInput,
      update: Prisma.RegulationUncheckedUpdateInput,
    ) {
      return client.regulation.upsert({ where: { id }, create, update });
    },
  };
}
