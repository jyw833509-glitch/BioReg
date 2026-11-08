// Current source coverage is independent of the most recent (possibly one-source) job.
export function syncLogDisplayStatus(log: {
  status: string;
  finished_at: Date | string | null;
}) {
  return log.finished_at === null ? "RUNNING" : log.status;
}

export function sourceCoverageStatus(health: Record<string, string>) {
  const active = Object.values(health).filter((value) => value !== "DISABLED");
  if (!active.length) return "NOT_RUN";
  if (active.every((value) => value === "HEALTHY")) return "SUCCESS";
  return active.some((value) => value === "HEALTHY" || value === "DEGRADED")
    ? "PARTIAL_SUCCESS"
    : "FAILED";
}
export function syncStatusLabel(status: string) {
  return (
    (
      {
        SUCCESS: "成功",
        PARTIAL_SUCCESS: "部分成功",
        FAILED: "未完成",
        RUNNING: "执行中",
        SKIPPED: "本次未到调度时间",
        NOT_RUN: "尚未运行",
      } as Record<string, string>
    )[status] || status
  );
}
