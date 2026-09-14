import { db } from "@/server/db";
import { json, failure } from "@/server/http";
import { promptRequest, generate } from "@/server/ai/generator";
import { buildContext } from "@/server/ai/context";
import { providers, templates } from "@/lib/external-ai";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const params = Object.fromEntries(new URL(request.url).searchParams);
    if (!Object.keys(params).length) return json({ providers, templates });
    const q = promptRequest.parse(params);
    return json(generate(q, await buildContext(db(), q)));
  } catch (e) {
    return failure(e);
  }
}
