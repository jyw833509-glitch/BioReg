ALTER TYPE "Agency" ADD VALUE IF NOT EXISTS 'USP';
ALTER TYPE "Agency" ADD VALUE IF NOT EXISTS 'EDQM';
CREATE TABLE "catalog_entries" (
  "source_id" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "candidate" JSONB NOT NULL,
  "discovered_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "catalog_entries_pkey" PRIMARY KEY ("source_id", "url"),
  CONSTRAINT "catalog_entries_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
