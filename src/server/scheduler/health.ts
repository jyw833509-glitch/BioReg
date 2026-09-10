import type { SourceHealth } from "../../generated/prisma/client";
export function classifyFailure(errors: string[]) {
  const message = errors.join(" ");
  if (
    /HTTP (?:202|403|412|429)|verification|access denied|captcha|challenge|Sorry\s*-/i.test(
      message,
    )
  )
    return "RUNTIME_SOURCE_LIMITATION";
  if (/Database|Prisma|SQLSTATE/i.test(message)) return "DATABASE_ERROR";
  if (
    /fetch failed|timeout|timed out|ECONN|ENOTFOUND|HTTP 5\d\d|network|socket/i.test(
      message,
    )
  )
    return "RUNTIME_SOURCE_LIMITATION";
  return errors.length ? "CONNECTOR_ERROR" : null;
}
export function healthFor(status: string, errors: string[]): SourceHealth {
  if (status === "SUCCESS") return "HEALTHY";
  if (
    status === "PARTIAL_SUCCESS" ||
    /HTTP (?:202|403|412|429)|verification|access denied|captcha|challenge|Sorry\s*-/i.test(
      errors.join(" "),
    )
  )
    return "DEGRADED";
  return "UNAVAILABLE";
}
export function safeError(error: unknown) {
  if (error && typeof error === "object" && "code" in error)
    return `Database/transport error ${String(error.code)
      .replace(/[^\w-]/g, "")
      .slice(0, 40)}`;
  return error instanceof Error
    ? error.message
        .replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]")
        .replace(
          /(password|token|secret|authorization)\s*[=:]\s*\S+/gi,
          "$1=[redacted]",
        )
        .slice(0, 300)
    : "Unknown connector failure";
}
