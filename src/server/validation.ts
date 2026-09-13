import { CHANGE_TYPES } from "./changes/detect";
import { z } from "zod";
import {
  Agency,
  DocumentType,
  RegulationStatus,
  Importance,
} from "../generated/prisma/enums";
import { documentCode, statusCode } from "../lib/labels";
export const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Invalid calendar date",
  );
export const querySchema = z
  .object({
    q: z.string().max(300).default(""),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    sort: z
      .enum(["Newest", "Recently Updated", "Importance", "Regulator"])
      .default("Newest"),
    regulator: z.enum(Agency).optional(),
    categories: z.string().max(150).optional(),
    subcategories: z.string().max(150).optional(),
    product_types: z.string().max(150).optional(),
    development_stages: z.string().max(150).optional(),
    affected_departments: z.string().max(150).optional(),
    status: z
      .string()
      .transform(statusCode)
      .pipe(z.enum(RegulationStatus))
      .optional(),
    document_type: z
      .string()
      .transform(documentCode)
      .pipe(z.enum(DocumentType))
      .optional(),
    importance_level: z
      .string()
      .transform((v) => v.toUpperCase())
      .pipe(z.enum(Importance))
      .optional(),
    date: calendarDate.optional(),
    dateTo: calendarDate.optional(),
    change: z.enum(["New", "Updated"]).optional(),
    is_new: z
      .enum(["true", "false"])
      .transform((v) => v === "true")
      .optional(),
    is_updated: z
      .enum(["true", "false"])
      .transform((v) => v === "true")
      .optional(),
    today: z
      .union([
        z.boolean(),
        z.enum(["true", "false"]).transform((v) => v === "true"),
      ])
      .optional(),
    updates: z
      .union([
        z.boolean(),
        z.enum(["true", "false"]).transform((v) => v === "true"),
      ])
      .optional(),
  })
  .strict();
export type Query = z.infer<typeof querySchema>;
const stringList = z
  .array(z.string().trim().min(1).max(150))
  .max(50)
  .default([]);
export const watchlistSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: z.string().max(1000).default(""),
    regulators: z.array(z.enum(Agency)).max(6).default([]),
    categories: stringList,
    subcategories: stringList,
    product_types: stringList,
    development_stages: stringList,
    document_types: z.array(z.enum(DocumentType)).max(16).default([]),
    keywords: stringList,
    country_or_regions: stringList,
    affected_departments: stringList,
    statuses: z.array(z.enum(RegulationStatus)).default([]),
    change_types: z.array(z.enum(CHANGE_TYPES)).default([]),
    minimum_severity: z.enum(Importance).nullable().default(null),
    importance_levels: z.array(z.enum(Importance)).max(4).default([]),
    enabled: z.boolean().default(true),
  })
  .strict();
export type WatchlistInput = z.infer<typeof watchlistSchema>;
export function parseQuery(raw: Record<string, string | undefined>) {
  const input = { ...raw };
  if (input.agency) {
    input.regulator = input.agency;
    delete input.agency;
  }
  if (input.topic) {
    input.categories = input.topic;
    delete input.topic;
  }
  for (const key of Object.keys(input))
    if (input[key] === "" || input[key] === undefined) delete input[key];
  return querySchema.parse(input);
}
