import { db } from "@/server/db";
import { regulationRepository } from "@/server/repositories/regulation-repository";
import { parseQuery } from "@/server/validation";
import { json, failure } from "@/server/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    return json(
      await regulationRepository(db()).list(
        parseQuery(Object.fromEntries(new URL(request.url).searchParams)),
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
