-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Agency" AS ENUM ('FDA', 'EMA', 'NMPA', 'CDE', 'ICH');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('FINAL_GUIDANCE', 'DRAFT_GUIDANCE', 'GUIDELINE', 'REVISED_GUIDELINE', 'QA', 'REFLECTION_PAPER', 'CONCEPT_PAPER', 'POSITION_PAPER', 'RECOMMENDATION', 'TECHNICAL_GUIDELINE', 'NOTICE', 'ANNOUNCEMENT', 'REGULATION', 'REGULATION_AMENDMENT', 'CONSULTATION_DRAFT', 'OTHER');

-- CreateEnum
CREATE TYPE "RegulationStatus" AS ENUM ('DRAFT', 'FINAL', 'EFFECTIVE', 'REVISED', 'SUPERSEDED', 'WITHDRAWN', 'UNDER_CONSULTATION', 'ARCHIVED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "Importance" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('SUCCESS', 'PARTIAL_SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "sources" (
    "id" TEXT NOT NULL,
    "code" "Agency" NOT NULL,
    "name" TEXT NOT NULL,
    "country_or_region" TEXT NOT NULL,
    "official_base_url" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sync_frequency" INTEGER NOT NULL DEFAULT 6,
    "last_sync_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regulations" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "regulator" "Agency" NOT NULL,
    "country_or_region" TEXT NOT NULL,
    "title_original" TEXT NOT NULL,
    "title_zh" TEXT NOT NULL DEFAULT '',
    "document_number" TEXT,
    "document_type" "DocumentType" NOT NULL,
    "status" "RegulationStatus" NOT NULL DEFAULT 'UNKNOWN',
    "publication_date" DATE NOT NULL,
    "effective_date" DATE,
    "updated_date" DATE,
    "official_url" TEXT,
    "canonical_url" TEXT,
    "pdf_url" TEXT,
    "source_page_url" TEXT,
    "official_summary" TEXT,
    "summary_zh" TEXT NOT NULL DEFAULT '',
    "content_text" TEXT NOT NULL DEFAULT '',
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subcategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "product_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "development_stages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "affected_departments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "importance_level" "Importance" NOT NULL DEFAULT 'MEDIUM',
    "version" TEXT NOT NULL DEFAULT '1.0',
    "previous_version_id" TEXT,
    "is_current_version" BOOLEAN NOT NULL DEFAULT true,
    "is_new" BOOLEAN NOT NULL DEFAULT true,
    "is_updated" BOOLEAN NOT NULL DEFAULT false,
    "content_hash" TEXT,
    "source_hash" TEXT,
    "first_detected_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_checked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "is_mock" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "regulations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regulation_versions" (
    "id" TEXT NOT NULL,
    "regulation_id" TEXT NOT NULL,
    "version_name" TEXT NOT NULL,
    "document_url" TEXT,
    "pdf_url" TEXT,
    "publication_date" DATE NOT NULL,
    "detected_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "RegulationStatus" NOT NULL,
    "content_hash" TEXT,
    "source_hash" TEXT,
    "content_snapshot" TEXT NOT NULL,
    "previous_version_id" TEXT,
    "change_detected" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regulation_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "started_at" TIMESTAMPTZ(3) NOT NULL,
    "finished_at" TIMESTAMPTZ(3),
    "status" "SyncStatus" NOT NULL,
    "records_found" INTEGER NOT NULL DEFAULT 0,
    "records_new" INTEGER NOT NULL DEFAULT 0,
    "records_updated" INTEGER NOT NULL DEFAULT 0,
    "records_failed" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "is_mock" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlists" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "regulators" "Agency"[] DEFAULT ARRAY[]::"Agency"[],
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subcategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "product_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "development_stages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "document_types" "DocumentType"[] DEFAULT ARRAY[]::"DocumentType"[],
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "importance_levels" "Importance"[] DEFAULT ARRAY[]::"Importance"[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "watchlists_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sources_code_key" ON "sources"("code");

-- CreateIndex
CREATE UNIQUE INDEX "sources_id_code_key" ON "sources"("id", "code");

-- CreateIndex
CREATE INDEX "regulations_regulator_idx" ON "regulations"("regulator");

-- CreateIndex
CREATE INDEX "regulations_source_id_title_original_publication_date_idx" ON "regulations"("source_id", "title_original", "publication_date");

-- CreateIndex
CREATE INDEX "regulations_publication_date_idx" ON "regulations"("publication_date" DESC);

-- CreateIndex
CREATE INDEX "regulations_status_idx" ON "regulations"("status");

-- CreateIndex
CREATE INDEX "regulations_document_type_idx" ON "regulations"("document_type");

-- CreateIndex
CREATE INDEX "regulations_importance_level_idx" ON "regulations"("importance_level");

-- CreateIndex
CREATE INDEX "regulations_content_hash_idx" ON "regulations"("content_hash");

-- CreateIndex
CREATE INDEX "regulations_canonical_url_idx" ON "regulations"("canonical_url");

-- CreateIndex
CREATE INDEX "regulations_first_detected_at_idx" ON "regulations"("first_detected_at");

-- CreateIndex
CREATE INDEX "regulations_last_checked_at_idx" ON "regulations"("last_checked_at");

-- CreateIndex
CREATE INDEX "regulations_categories_idx" ON "regulations" USING GIN ("categories");

-- CreateIndex
CREATE INDEX "regulations_subcategories_idx" ON "regulations" USING GIN ("subcategories");

-- CreateIndex
CREATE INDEX "regulations_keywords_idx" ON "regulations" USING GIN ("keywords");

-- CreateIndex
CREATE INDEX "regulations_product_types_idx" ON "regulations" USING GIN ("product_types");

-- CreateIndex
CREATE INDEX "regulations_development_stages_idx" ON "regulations" USING GIN ("development_stages");

-- CreateIndex
CREATE INDEX "regulations_affected_departments_idx" ON "regulations" USING GIN ("affected_departments");

-- CreateIndex
CREATE INDEX "regulation_versions_detected_at_idx" ON "regulation_versions"("detected_at");

-- CreateIndex
CREATE INDEX "regulation_versions_content_hash_idx" ON "regulation_versions"("content_hash");

-- CreateIndex
CREATE UNIQUE INDEX "regulation_versions_regulation_id_version_name_key" ON "regulation_versions"("regulation_id", "version_name");

-- CreateIndex
CREATE INDEX "sync_logs_source_id_started_at_idx" ON "sync_logs"("source_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "watchlists_enabled_idx" ON "watchlists"("enabled");

-- CreateIndex
CREATE INDEX "watchlists_regulators_idx" ON "watchlists" USING GIN ("regulators");

-- AddForeignKey
ALTER TABLE "regulations" ADD CONSTRAINT "regulations_source_id_regulator_fkey" FOREIGN KEY ("source_id", "regulator") REFERENCES "sources"("id", "code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulations" ADD CONSTRAINT "regulations_previous_version_id_fkey" FOREIGN KEY ("previous_version_id") REFERENCES "regulation_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulation_versions" ADD CONSTRAINT "regulation_versions_regulation_id_fkey" FOREIGN KEY ("regulation_id") REFERENCES "regulations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regulation_versions" ADD CONSTRAINT "regulation_versions_previous_version_id_fkey" FOREIGN KEY ("previous_version_id") REFERENCES "regulation_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_logs" ADD CONSTRAINT "sync_logs_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Deduplication foundations, with nullable identities and source-level isolation.
CREATE UNIQUE INDEX regulation_source_document_unique ON regulations(source_id, document_number, is_mock) WHERE document_number IS NOT NULL;
CREATE UNIQUE INDEX regulation_source_canonical_unique ON regulations(source_id, canonical_url, is_mock) WHERE canonical_url IS NOT NULL;
CREATE UNIQUE INDEX regulation_fallback_unique ON regulations(source_id, lower(btrim(title_original)), publication_date, is_mock) WHERE document_number IS NULL AND canonical_url IS NULL;
ALTER TABLE regulations ADD CONSTRAINT nonempty_title CHECK (length(btrim(title_original)) > 0);
ALTER TABLE regulations ADD CONSTRAINT nonempty_document_number CHECK (document_number IS NULL OR length(btrim(document_number)) > 0);
ALTER TABLE regulations ADD CONSTRAINT nonempty_canonical CHECK (canonical_url IS NULL OR length(btrim(canonical_url)) > 0);
ALTER TABLE regulations ADD CONSTRAINT mock_fact_boundary CHECK (NOT is_mock OR (official_url IS NULL AND pdf_url IS NULL AND canonical_url IS NULL AND source_page_url IS NULL AND official_summary IS NULL));
ALTER TABLE sources ADD CONSTRAINT positive_sync_frequency CHECK (sync_frequency > 0);
ALTER TABLE sync_logs ADD CONSTRAINT nonnegative_counts CHECK (records_found >= 0 AND records_new >= 0 AND records_updated >= 0 AND records_failed >= 0);
ALTER TABLE sync_logs ADD CONSTRAINT chronological_sync CHECK (finished_at IS NULL OR finished_at >= started_at);
ALTER TABLE watchlists ADD CONSTRAINT nonempty_watchlist_name CHECK (length(btrim(name)) > 0);
-- Versions are append-only regardless of which application or future importer writes them.
CREATE FUNCTION protect_regulation_version() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'RegulationVersion is append-only'; END; $$;
CREATE TRIGGER regulation_version_immutable BEFORE UPDATE OR DELETE ON regulation_versions FOR EACH ROW EXECUTE FUNCTION protect_regulation_version();
CREATE FUNCTION validate_version_parent() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.previous_version_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM regulation_versions v WHERE v.id=NEW.previous_version_id AND v.regulation_id=NEW.regulation_id) THEN RAISE EXCEPTION 'Previous version must belong to the same regulation'; END IF;
 RETURN NEW; END; $$;
CREATE TRIGGER regulation_version_parent BEFORE INSERT ON regulation_versions FOR EACH ROW EXECUTE FUNCTION validate_version_parent();
CREATE FUNCTION validate_regulation_previous() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.previous_version_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM regulation_versions v WHERE v.id=NEW.previous_version_id AND v.regulation_id=NEW.id) THEN RAISE EXCEPTION 'Previous version must belong to the same regulation'; END IF;
 RETURN NEW; END; $$;
CREATE TRIGGER regulation_previous_parent BEFORE INSERT OR UPDATE ON regulations FOR EACH ROW EXECUTE FUNCTION validate_regulation_previous();
