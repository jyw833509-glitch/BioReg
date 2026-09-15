import { writeRecord } from "../src/server/connectors/shared/writer";
import { normalizeDocument } from "../src/server/connectors/shared/normalizer";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { loadEnvConfig } from "@next/env";
import { createClient } from "../src/server/db";
import { seedDatabase } from "../prisma/seed-data";
loadEnvConfig(process.cwd());
async function main() {
  const original = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  assert.ok(original);
  const schema = "bioreg_smoke_" + randomUUID().replaceAll("-", "");
  const admin = createClient(original);
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  const url = new URL(original);
  url.searchParams.set("schema", schema);
  const client = createClient(url.toString());
  let server: ReturnType<typeof spawn> | undefined;
  try {
    const migration = spawnSync(
      process.execPath,
      ["node_modules/prisma/build/index.js", "migrate", "deploy"],
      {
        env: { ...process.env, DIRECT_URL: url.toString() },
        stdio: "pipe",
        windowsHide: true,
      },
    );
    assert.equal(migration.status, 0);
    const listener = createServer();
    await new Promise<void>((resolve) =>
      listener.listen(0, "127.0.0.1", resolve),
    );
    const address = listener.address();
    assert.ok(address && typeof address === "object");
    const port = address.port;
    await new Promise<void>((resolve) => listener.close(() => resolve()));
    const origin = `http://127.0.0.1:${port}`;
    server = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(port),
      ],
      {
        env: {
          ...process.env,
          DATABASE_URL: url.toString(),
          APP_ORIGIN: origin,
          BIOREG_INCLUDE_MOCK_DATA: "true",
        },
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      },
    );
    server.stdout?.resume();
    server.stderr?.resume();
    let ready = false;
    for (let i = 0; i < 40; i++) {
      try {
        if ((await fetch(origin + "/api/health")).ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 250));
    }
    assert.ok(ready, "Production test server failed to start");
    for (const route of ["/", "/today", "/regulations", "/updates"]) {
      const response = await fetch(origin + route);
      assert.equal(response.status, 200, route);
      assert.match(
        await response.text(),
        /No regulatory records available yet\./,
        route,
      );
    }
    assert.equal((await fetch(origin + "/regulations/missing")).status, 404);
    assert.equal((await fetch(origin + "/api/regulations?page=0")).status, 400);
    assert.equal(
      (
        await fetch(origin + "/api/watchlists", {
          method: "POST",
          headers: {
            Origin: "https://example.invalid",
            "Content-Type": "application/json",
          },
          body: '{"name":"Rejected"}',
        })
      ).status,
      403,
    );
    await seedDatabase(client);
    const page1 = await (
      await fetch(origin + "/api/regulations?pageSize=10&page=1")
    ).json();
    const page2 = await (
      await fetch(origin + "/api/regulations?pageSize=10&page=2")
    ).json();
    assert.equal(page1.pagination.total, 15);
    assert.equal(page1.data.length, 10);
    assert.equal(page2.data.length, 5);
    const search = await (
      await fetch(
        origin +
          "/api/regulations?q=" +
          encodeURIComponent("治疗性蛋白") +
          "&regulator=FDA",
      )
    ).json();
    assert.equal(search.data.length, 1);
    const write = await fetch(origin + "/api/watchlists", {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Smoke test watch", regulators: ["FDA"] }),
    });
    assert.equal(write.status, 201);
    const watch = await write.json();
    assert.equal(
      (await (await fetch(origin + "/api/watchlists")).json()).data.some(
        (w: { id: string }) => w.id === watch.data.id,
      ),
      true,
    );
    const detail = await fetch(origin + "/api/regulations/mock-1");
    assert.equal(detail.status, 200);
    assert.equal((await detail.json()).data.versions.length, 2);

    await fetch(origin + "/api/watchlists/" + watch.data.id, {
      method: "PATCH",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ regulators: ["EMA"] }),
    });
    // All fixtures remain confined to this disposable random schema.
    const official = normalizeDocument(
      {
        title: "Biologics isolated smoke fixture",
        url: "https://www.ema.europa.eu/isolated-smoke",
        sourcePage: "https://www.ema.europa.eu/",
        type: "Guideline",
        status: "Draft",
        content: "Scope\n\nInitial manufacturing paragraph.",
        attachments: [],
      },
      "EMA",
      () => "GUIDELINE",
      () => "DRAFT",
    ).data;
    await writeRecord(client, "source-ema", official);
    await writeRecord(client, "source-ema", {
      ...official,
      status: "FINAL",
      content_text: "Scope\n\nRevised manufacturing paragraph.",
    });
    const changeResponse = await fetch(origin + "/api/changes");
    assert.equal(changeResponse.status, 200);
    const changes = (await changeResponse.json()).data;
    assert.equal(changes.length, 2);
    const event = changes.find(
      (e: { previous_version_id: string | null }) => e.previous_version_id,
    );
    assert.ok(event.change_types.includes("DRAFT_TO_FINAL"));
    const history = await (
      await fetch(
        origin + "/api/regulations/" + event.regulation_id + "/versions",
      )
    ).json();
    assert.equal(history.data.length, 2);
    assert.equal(
      (
        await fetch(
          origin +
            "/api/regulations/" +
            event.regulation_id +
            "/versions/" +
            event.current_version_id,
        )
      ).status,
      200,
    );
    const comparison = await (
      await fetch(
        origin +
          "/api/regulations/" +
          event.regulation_id +
          "/compare?from=" +
          event.previous_version_id +
          "&to=" +
          event.current_version_id,
      )
    ).json();
    assert.ok(comparison.data.change_types.includes("CONTENT_CHANGED"));
    assert.match(
      await (await fetch(origin + "/updates")).text(),
      /DRAFT_TO_FINAL/,
    );
    assert.match(
      await (
        await fetch(origin + "/regulations/" + event.regulation_id)
      ).text(),
      /BioReg Internal/,
    );
    const { engagementAfterSync } =
      await import("../src/server/engagement/service");
    await engagementAfterSync(client);
    await engagementAfterSync(client);
    const notices = await (
      await fetch(origin + "/api/notifications?state=unread")
    ).json();
    assert.equal(notices.data.length, 2);
    const read = await fetch(origin + "/api/notifications", {
      method: "PATCH",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    assert.equal(read.status, 200);
    assert.equal(
      (await (await fetch(origin + "/api/notifications/statistics")).json())
        .data.unread,
      0,
    );
    const digest = await fetch(origin + "/api/digests", {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ date: new Date().toISOString().slice(0, 10) }),
    });
    assert.equal(digest.status, 200);
    for (const p of [
      "/notifications",
      "/digest",
      "/today",
      "/watchlist",
      "/api/digest-settings",
      "/api/digests",
    ]) {
      assert.equal((await fetch(origin + p)).status, 200, p);
    }
    const measured = await fetch(origin + "/api/dashboard");
    assert.equal(measured.status, 200);
    assert.match(
      measured.headers.get("server-timing") || "",
      /queries;desc="[1-9][0-9]*"/,
    );
    const beforeAI = JSON.stringify({
      records: await client.regulation.findMany({ orderBy: { id: "asc" } }),
      versions: await client.regulationVersion.findMany({
        orderBy: { id: "asc" },
      }),
      changes: await client.changeEvent.findMany({ orderBy: { id: "asc" } }),
      watches: await client.watchlist.findMany({ orderBy: { id: "asc" } }),
      notifications: await client.notificationEvent.findMany({
        orderBy: { id: "asc" },
      }),
      digests: await client.dailyDigest.findMany({ orderBy: { id: "asc" } }),
    });
    const savedDigest = await client.dailyDigest.findFirstOrThrow();
    for (const context of [
      { kind: "regulation", id: event.regulation_id, template: "cmc" },
      { kind: "change", id: event.id, template: "change" },
      {
        kind: "comparison",
        id: event.regulation_id,
        template: "compare",
        from: event.previous_version_id,
        to: event.current_version_id,
      },
      { kind: "digest", id: savedDigest.id, template: "digest" },
    ]) {
      const response = await fetch(
        origin +
          "/api/ai?" +
          new URLSearchParams(context as Record<string, string>),
      );
      assert.equal(response.status, 200, JSON.stringify(context));
      const result = await response.json();
      assert.match(result.prompt, /External AI Interpretation/);
      assert.match(result.prompt, /当前提供的官方资料不足以确认/);
    }
    assert.equal((await fetch(origin + "/ai-tools")).status, 200);
    for (const type of [
      "regulations",
      "changes",
      "versions",
      "digest",
      "watchlist",
      "sources",
      "notifications",
      "summary",
    ]) {
      const preview = await fetch(origin + "/api/reports?type=" + type);
      assert.equal(preview.status, 200, type);
      const data = await preview.json();
      assert.ok(Array.isArray(data.data.rows));
      const csv = await fetch(
        origin + "/api/reports?type=" + type + "&format=csv",
      );
      assert.equal(csv.status, 200);
      assert.match(await csv.text(), /id,regulation_id,agency,official_url/);
      if (["regulations", "changes", "digest"].includes(type)) {
        const pdf = await fetch(
          origin + "/api/reports?type=" + type + "&format=pdf&limit=2",
        );
        assert.equal(pdf.status, 200);
        assert.equal(
          Buffer.from(await pdf.arrayBuffer())
            .subarray(0, 4)
            .toString(),
          "%PDF",
        );
      }
    }
    const reportComparison = await fetch(
      origin +
        "/api/reports?" +
        new URLSearchParams({
          type: "comparison",
          regulation: event.regulation_id,
          from: event.previous_version_id,
          to: event.current_version_id,
        }),
    );
    assert.equal(reportComparison.status, 200);
    assert.match(await reportComparison.text(), /unchanged_fields/);
    assert.equal(
      (await fetch(origin + "/api/reports?start=2026-02-30")).status,
      400,
    );
    assert.equal((await fetch(origin + "/reports")).status, 200);
    assert.equal(
      (await fetch(origin + "/api/ai?kind=regulation&id=missing")).status,
      404,
    );
    assert.equal(
      (await fetch(origin + "/api/ai?kind=comparison&id=x&from=a&to=a")).status,
      400,
    );
    assert.equal(
      JSON.stringify({
        records: await client.regulation.findMany({ orderBy: { id: "asc" } }),
        versions: await client.regulationVersion.findMany({
          orderBy: { id: "asc" },
        }),
        changes: await client.changeEvent.findMany({ orderBy: { id: "asc" } }),
        watches: await client.watchlist.findMany({ orderBy: { id: "asc" } }),
        notifications: await client.notificationEvent.findMany({
          orderBy: { id: "asc" },
        }),
        digests: await client.dailyDigest.findMany({ orderBy: { id: "asc" } }),
      }),
      beforeAI,
      "AI API must not write official data",
    );
    console.log(
      "Production HTTP smoke checks passed: four empty pages, 404/400/403, seeded pagination/search, detail history, and Watchlist persistence.",
    );
  } finally {
    if (server && !server.killed) {
      server.kill();
      await new Promise<void>((resolve) =>
        server!.once("exit", () => resolve()),
      );
    }
    await client.$disconnect();
    await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.$disconnect();
  }
}
main().catch((error) => {
  console.error(
    "HTTP_SMOKE_FAILED",
    error.code || error.name,
    String(error.message)
      .replace(/postgres(?:ql)?:\/\/\S+/g, "[REDACTED]")
      .slice(0, 1000),
  );
  process.exitCode = 1;
});
