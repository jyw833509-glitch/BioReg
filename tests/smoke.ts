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
        env: { ...process.env, DATABASE_URL: url.toString() },
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
    "HTTP_SMOKE_FAILED", error.code || error.name, String(error.message).replace(/postgres(?:ql)?:\/\/\S+/g,"[REDACTED]").slice(0,1000),
  );
  process.exitCode = 1;
});
