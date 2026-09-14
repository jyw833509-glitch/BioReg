import { z } from "zod";
export function json(data: unknown, status = 200) {
  if (status >= 400 && data && typeof data === "object") {
    const error = data as Record<string, unknown>;
    data = {
      ...error,
      code: error.code || error.error || "REQUEST_FAILED",
      message: error.message || "请求未完成，请检查输入或稍后重试。",
      request_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
  }
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export function failure(error: unknown) {
  if (error instanceof z.ZodError)
    return json(
      {
        error: "INVALID_PARAMETERS",
        message: "请检查输入的参数。",
        issues: error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      },
      400,
    );
  const code = (error as { code?: string })?.code;
  if (code === "REPORT_TOO_LARGE")
    return json(
      { error: code, message: "报告超过大小上限，请缩小日期范围或记录数。" },
      413,
    );
  if (code === "P2025") return json({ error: "NOT_FOUND" }, 404);
  if (code === "P2002") return json({ error: "CONFLICT" }, 409);
  console.error("BioReg data-layer request failed", {
    code: code || "DATABASE_ERROR",
  });
  return json(
    {
      error: "DATABASE_UNAVAILABLE",
      message: "数据库暂不可用，请检查连接配置后重试。",
    },
    503,
  );
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || request.headers.get("sec-fetch-site") === "cross-site")
    return false;
  try {
    const expected = new URL(
      process.env.APP_ORIGIN || process.env.BIOREG_SITE_ORIGIN || request.url,
    ).origin;
    return origin === expected;
  } catch {
    return false;
  }
}
export async function readJson(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("INVALID_JSON");
  let text = "";
  let size = 0;
  const decoder = new TextDecoder();
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    size += result.value.length;
    if (size > 16000) {
      await reader.cancel();
      throw new Error("PAYLOAD_TOO_LARGE");
    }
    text += decoder.decode(result.value, { stream: true });
  }
  text += decoder.decode();
  return JSON.parse(text);
}
