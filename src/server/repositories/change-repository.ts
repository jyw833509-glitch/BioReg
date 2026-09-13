import type { Db } from "../db";
import { visibleWhere } from "../visibility";
import { detectChange } from "../changes/detect";
export function changeRepository(client: Db) {
  return {
    async list(regulationId?: string, take = 50) {
      const events = await client.changeEvent.findMany({
        where: { regulation_id: regulationId, regulation: visibleWhere() },
        orderBy: [{ detected_at: "desc" }, { id: "desc" }],
        take: Math.min(100, take),
        include: {
          regulation: { select: { title_original: true, regulator: true } },
          current_version: { select: { version_name: true } },
        },
      });
      return events.map((e) => ({
        ...e,
        detected_at: e.detected_at.toISOString(),
      }));
    },
    async version(regulationId: string, versionId: string) {
      const v = await client.regulationVersion.findFirst({
        where: {
          id: versionId,
          regulation_id: regulationId,
          regulation: visibleWhere(),
        },
      });
      return v
        ? {
            ...v,
            detected_at: v.detected_at.toISOString(),
            publication_date:
              v.publication_date?.toISOString().slice(0, 10) || null,
            created_at: v.created_at.toISOString(),
          }
        : null;
    },
    async compare(regulationId: string, from: string, to: string) {
      const a = await this.version(regulationId, from);
      const b = await this.version(regulationId, to);
      if (!a || !b) return null;
      try {
        return {
          from: a.id,
          to: b.id,
          analysis: "BioReg Change Detection — not an official statement",
          ...detectChange(
            JSON.parse(a.content_snapshot),
            JSON.parse(b.content_snapshot),
          ),
        };
      } catch {
        return {
          from: a.id,
          to: b.id,
          change_types: ["UNKNOWN_CHANGE"],
          change_summary:
            "Legacy snapshot is not structured; inspect original snapshots.",
        };
      }
    },
  };
}
