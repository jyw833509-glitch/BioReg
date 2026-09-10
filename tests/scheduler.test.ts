import test from "node:test";
import assert from "node:assert/strict";
import {
  healthFor,
  classifyFailure,
  safeError,
} from "../src/server/scheduler/health";
import { isDue, globalStatus } from "../src/server/scheduler/run";
import { sourceDefaults } from "../src/server/scheduler/config";
test("Access limits are degraded; parser and transport failure remain distinguishable", () => {
  for (const message of [
    "official source HTTP 202",
    "Access denied by official source (HTTP 200 error page)",
    "CAPTCHA challenge",
  ]) {
    assert.equal(healthFor("FAILED", [message]), "DEGRADED");
    assert.equal(classifyFailure([message]), "RUNTIME_SOURCE_LIMITATION");
  }
  assert.equal(healthFor("FAILED", ["fetch failed"]), "UNAVAILABLE");
  assert.equal(
    classifyFailure(["Unrecognized CDE guidance table"]),
    "CONNECTOR_ERROR",
  );
  assert.equal(healthFor("SUCCESS", []), "HEALTHY");
});
test("Due calculation uses last attempt, including degraded attempts, and central defaults", () => {
  const now = new Date("2026-09-10T12:00:00Z");
  assert.equal(
    isDue(
      { last_sync_at: new Date("2026-09-10T00:00:00Z"), sync_frequency: 12 },
      now,
    ),
    true,
  );
  assert.equal(isDue({ last_sync_at: now, sync_frequency: 12 }, now), false);
  assert.equal(isDue({ last_sync_at: null, sync_frequency: 24 }, now), true);
  assert.deepEqual(
    sourceDefaults
      .filter((s) => s.sync_frequency === 24)
      .map((s) => s.code)
      .sort(),
    ["ICH", "PMDA"],
  );
});
test("Global results distinguish full success, partial failure, all failure and no due work", () => {
  assert.equal(
    globalStatus([{ status: "SUCCESS" }, { status: "FAILED" }]),
    "PARTIAL_SUCCESS",
  );
  assert.equal(globalStatus([{ status: "FAILED" }]), "FAILED");
  assert.equal(globalStatus([{ status: "SKIPPED_DISABLED" }]), "SKIPPED");
  assert.equal(
    globalStatus([{ status: "SUCCESS" }, { status: "SKIPPED_NOT_DUE" }]),
    "SUCCESS",
  );
});
test("Error summaries redact connection strings and secret assignments", () => {
  const error = safeError(
    new Error(
      "postgresql://alice:topsecret@example.test/db password=abc token=def",
    ),
  );
  assert.ok(!/alice|topsecret|abc|def/.test(error));
});
