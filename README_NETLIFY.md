# BioReg Netlify production hosting

Use the existing GitHub repository with Netlify's automatically managed official OpenNext adapter. No static export, custom server, manual plugin pin, or SPA rewrite is required. Keep the Free plan; do not enable paid add-ons automatically.

## Build and runtime

- Repository root, main branch; `netlify.toml` configures `npm run build` and `.next`.
- Node.js 24 and npm 11.19.0. The lockfile has been validated with this npm version.
- Existing `postinstall` and `build` generate Prisma Client 7.10.0. The application uses `@prisma/adapter-pg` in Node.js, not an Edge database client.
- Dynamic App Router pages use `force-dynamic`; each request reads PostgreSQL. An already open browser page needs refreshing to show newly synchronized data.
- Do not run `db:seed` during deployment. Migrations and the six-source scheduler stay in the existing GitHub Actions workflow.

## Environment variables (configure in Netlify UI, never commit values)

| Name | Value / scope |
| --- | --- |
| DATABASE_URL | Official Supabase Transaction pooler URI (port 6543) with the real, URL-encoded password; production context, Builds and Functions scopes (or all scopes if scope controls are unavailable). |
| BIOREG_INCLUDE_MOCK_DATA | `false`, production Functions and Builds scopes. Production defaults to excluding mock records. Never set `true` on the live site. |
| APP_ORIGIN | Optional canonical HTTPS production URL for single-user watchlist writes; set after domain assignment. |

Do not use a `NEXT_PUBLIC_` prefix for database credentials. Do not expose the production database to untrusted deploy previews. GitHub Actions uses a separate DIRECT_URL secret (Direct or Session pooler port 5432) for migrations and the scheduler's session locks. Netlify does not need DIRECT_URL: Prisma generation does not connect to the database. Retain the same Supabase project. No Supabase Data API, service role key, or replacement database is needed.

## Acceptance still required after publishing

Record the production URL and successful deploy. Check `/api/health`, `/`, `/today`, `/regulations`, a real regulation detail, `/updates`, `/agencies`, `/reports`, and `/ai-tools`. Verify real cloud records, source status and sync times against the GitHub manual run. Reports and AI Tools retain their existing Phase 5 functionality; do not add Phase 6 features.

The successful cloud manual run is https://github.com/jyw833509-glitch/BioReg/actions/runs/34563604541 (five HEALTHY sources; CDE DEGRADED). Hosting preparation is not production acceptance. Natural scheduled execution must be independently verified; no changes to the regulatory sync workflow are made for Netlify hosting.

Official reference: https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/

## Connection exhaustion fix

Each warm runtime keeps one global Prisma client with a pg pool maximum of 1 and a 10-second idle timeout. This limits connections per instance; Supabase Transaction Pooler multiplexes the instances. With Prisma 7 adapter-pg, queries are unnamed unless statementNameGenerator is supplied (we do not supply it). The legacy Prisma engine pgbouncer=true flag is not a pg driver pool setting and is not required here. Do not add connection_limit URL parameters to configure the pg pool.

References: https://supabase.com/docs/guides/database/prisma and https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/databases-connections/pgbouncer
