import { db } from "@/server/db";
import { json, failure } from "@/server/http";
import { reportQuery, buildReport } from "@/server/reports/data";
import { renderCSV } from "@/server/reports/csv";
import { renderPDF } from "@/server/reports/pdf";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const started = Date.now();
  try {
    const q = reportQuery.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const report = await buildReport(db(), q);
    if (q.format === "json") return json({ data: report });
    const body =
      q.format === "pdf"
        ? new Uint8Array(await renderPDF(report))
        : renderCSV(report);
    console.info("BioReg report generated", {
      type: q.type,
      format: q.format,
      count: report.rows.length,
      duration_ms: Date.now() - started,
    });
    return new Response(body, {
      headers: {
        "Content-Type":
          q.format === "pdf" ? "application/pdf" : "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="bioreg-' + q.type + "." + q.format + '"',
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
