import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
const connections = new WeakMap<PrismaClient, string>();
export function connectionFor(client: PrismaClient) {
  const url = connections.get(client);
  if (!url) throw new Error("Database client connection unavailable");
  return url;
}
export function createClient(url: string) {
  if (!/^postgres(?:ql)?:\/\//.test(url))
    throw new Error("INVALID_DATABASE_URL");
  const schema = new URL(url).searchParams.get("schema") || "public";
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema))
    throw new Error("INVALID_SCHEMA");
  const client = new PrismaClient({
    adapter: new PrismaPg(
      {
        connectionString: url,
        max: 1,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 10000,
        ...(schema === "public" ? {} : { options: `-c search_path=${schema}` }),
      },
      { schema },
    ),
    log: [],
  });
  connections.set(client, url);
  return client;
}
const state = globalThis as unknown as { bioregPrisma?: PrismaClient };
export function db() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL_REQUIRED");
  return (state.bioregPrisma ??= createClient(process.env.DATABASE_URL));
}
export type Db = PrismaClient;
