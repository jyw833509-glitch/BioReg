import PDFDocument from "pdfkit";
import path from "node:path";
import type { Report } from "./data";
const font = path.join(process.cwd(), "assets/fonts/NotoSansSC.ttf");
export async function renderPDF(report: Report): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 58, bottom: 58, left: 44, right: 44 },
    bufferPages: true,
    font,
  });
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  doc.font(font).fontSize(20).fillColor("#163e73").text("BioReg Radar");
  doc.fontSize(14).text(report.type + " · 法规情报报告");
  doc
    .moveDown()
    .fontSize(9)
    .fillColor("#334155")
    .text("Generated UTC: " + report.generated_at)
    .text(JSON.stringify(report.parameters));
  doc.moveDown().text(report.notice);
  if (report.limited)
    doc
      .fillColor("#a34b00")
      .text(
        "Limited report: selection or history exceeds displayed limit; narrow filters.",
      );
  if (!report.rows.length) doc.text("No matching records / 无符合条件的记录。");
  for (const [i, r] of report.rows.entries()) {
    doc.addPage();
    doc
      .fillColor("#163e73")
      .fontSize(13)
      .text(String(i + 1) + ". " + r.agency + " / " + r.id);
    doc
      .fontSize(9)
      .fillColor("#334155")
      .text(r.evidence)
      .text("Regulation ID: " + (r.regulation_id || "Not available"))
      .text("UTC: " + (r.timestamp || "Not available"));
    doc.text(
      "Official URL: " + (r.official_url || "Not disclosed / Not available"),
      {
        link: r.official_url.startsWith("https://")
          ? r.official_url
          : undefined,
      },
    );
    for (const [key, value] of Object.entries(r.details)) {
      doc.moveDown().fontSize(11).fillColor("#163e73").text(key);
      const text =
        typeof value === "string" ? value : JSON.stringify(value, null, 2);
      doc
        .fontSize(9)
        .fillColor("#172033")
        .text(text || "Not disclosed / Not available", {
          lineGap: 3,
          wordSpacing: 0,
        });
    }
  }
  const pages = doc.bufferedPageRange();
  for (let i = pages.start; i < pages.start + pages.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).fillColor("#64748b");
    doc.text("BioReg V1.0.0 · Official evidence / System analysis", 44, 25, {
      lineBreak: false,
    });
    doc.text(
      "Page " + (i + 1) + " / " + pages.count,
      44,
      doc.page.height - 30,
      { lineBreak: false },
    );
  }
  doc.end();
  return done;
}
