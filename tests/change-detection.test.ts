import test from "node:test";
import assert from "node:assert/strict";
import {
  detectChange,
  fingerprints,
  sectionDiff,
} from "../src/server/changes/detect";
import {
  normalizedText,
  normalizedUrl,
  assertOfficialContent,
} from "../src/server/changes/normalize";
const base = {
  title_original: "Biologics guidance",
  status: "DRAFT",
  document_type: "DRAFT_GUIDANCE",
  document_number: "A1",
  content_text: "Scope\n\nUse validated methods.\n\nReferences",
  official_url: "https://example.com/guidance?id=1",
  pdf_url: "https://example.com/a.pdf",
  attachment_urls: ["https://example.com/a.pdf"],
  publication_date: new Date("2026-08-01"),
  effective_date: new Date("2026-10-01"),
};
test("new document and identical capture", () => {
  assert.deepEqual(detectChange(null, base).change_types, ["NEW_DOCUMENT"]);
  assert.deepEqual(detectChange(base, { ...base }).change_types, []);
});
for (const [field, value, expected] of [
  ["title_original", "Updated biologics guidance", "TITLE_CHANGED"],
  ["document_number", "B2", "METADATA_CHANGED"],
  ["publication_date", new Date("2026-09-01"), "PUBLICATION_DATE_CHANGED"],
  ["effective_date", new Date("2026-11-01"), "EFFECTIVE_DATE_CHANGED"],
  ["pdf_url", "https://example.com/b.pdf", "PDF_CHANGED"],
  ["attachment_urls", ["https://example.com/b.pdf"], "ATTACHMENT_CHANGED"],
  [
    "content_text",
    "Scope\n\nUse two validated methods.\n\nReferences",
    "CONTENT_CHANGED",
  ],
] as const)
  test(`detect ${expected}`, () => {
    assert.ok(
      detectChange(base, { ...base, [field]: value }).change_types.includes(
        expected,
      ),
    );
  });
for (const [before, after, expected] of [
  ["DRAFT", "FINAL", "DRAFT_TO_FINAL"],
  ["FINAL", "REVISED", "FINAL_TO_REVISED"],
  ["EFFECTIVE", "WITHDRAWN", "DOCUMENT_WITHDRAWN"],
  ["EFFECTIVE", "SUPERSEDED", "DOCUMENT_SUPERSEDED"],
] as const)
  test(`${before} to ${after} is high severity`, () => {
    const d = detectChange(
      { ...base, status: before },
      { ...base, status: after },
    );
    assert.ok(d.change_types.includes(expected));
    assert.equal(d.severity, "HIGH");
  });
for (const [a, b, kind] of [
  ["A\n\nB", "A\n\nNew\n\nB", "Added"],
  ["A\n\nOld\n\nB", "A\n\nB", "Removed"],
  ["A\n\nOld\n\nB", "A\n\nChanged\n\nB", "Modified"],
] as const)
  test(`paragraph ${kind}`, () => {
    assert.equal(sectionDiff(a, b)[0].kind, kind);
  });
test("whitespace, line wraps, HTML and Unicode presentation do not create changes", () => {
  const a = { ...base, content_text: "Full width A text." };
  for (const content_text of [
    "Full  width\nA text.",
    "Full width\n\nA text.",
    "<div>Full width A text.</div>",
    "Ｆｕｌｌ width A text.",
  ])
    assert.deepEqual(detectChange(a, { ...a, content_text }).change_types, []);
  assert.equal(
    fingerprints(a).content_hash,
    fingerprints({ ...a, content_text: "Full  width A text." }).content_hash,
  );
});
test("repeated page headers, footers, page numbers and navigation removed conservatively", () => {
  const text = (h: string) =>
    `${h}\nPage 1 of 2\n\nFirst substantive paragraph.\n\nFooter\f${h}\nPage 2 of 2\n\nSecond substantive paragraph.\n\nFooter`;
  assert.equal(
    normalizedText(text("Old header")),
    normalizedText(text("New header")),
  );
  assert.equal(
    normalizedText("Home\n\nReal content\n\nGenerated at: 2026-09-12"),
    "Real content",
  );
  assert.equal(
    normalizedText("Effective date: 2026-09-12"),
    "Effective date: 2026-09-12",
  );
});
test("tracking and signed PDF tokens ignored but document identity parameters preserved", () => {
  const next = {
    ...base,
    official_url: base.official_url + "&utm_source=test",
    pdf_url: base.pdf_url + "?X-Amz-Signature=abc&Expires=123",
    attachment_urls: [base.pdf_url + "?token=temporary"],
  };
  assert.deepEqual(detectChange(base, next).change_types, []);
  assert.notEqual(
    normalizedUrl("https://example.com/?id=1"),
    normalizedUrl("https://example.com/?id=2"),
  );
});
test("downloaded file content hash detects same URL replacement", () => {
  const old = { ...base, source_metadata: { file_content_hash: "a" } };
  const d = detectChange(old, {
    ...old,
    source_metadata: { file_content_hash: "b" },
  });
  assert.ok(d.change_types.includes("CONTENT_CHANGED"));
});
for (const [title, content] of [
  ["Access denied", "Forbidden"],
  ["Guidance", "Please verify you are human"],
  ["Guidance", ""],
  ["Guidance", '<div class="g-recaptcha"></div>'],
])
  test("invalid capture rejected: " + content, () =>
    assert.throws(() => assertOfficialContent(title, content)),
  );

test("attachment additions and removals are medium severity", () => {
  for (const attachment_urls of [
    [],
    [...base.attachment_urls, "https://example.com/supplement.docx"],
  ]) {
    const d = detectChange(base, { ...base, attachment_urls });
    assert.ok(d.change_types.includes("ATTACHMENT_CHANGED"));
    assert.equal(d.severity, "MEDIUM");
  }
});
test("date serialization and absent optional arrays do not create false versions", () => {
  assert.deepEqual(
    detectChange(base, JSON.parse(JSON.stringify(base))).change_types,
    [],
  );
  assert.deepEqual(
    detectChange(
      { ...base, attachment_urls: [] },
      { ...base, attachment_urls: undefined },
    ).change_types,
    [],
  );
});
test("empty HTML and navigation-only pages are rejected", () => {
  for (const text of ["<html><body></body></html>", "<nav>Home</nav>"])
    assert.throws(() => assertOfficialContent("Guidance", text));
});
