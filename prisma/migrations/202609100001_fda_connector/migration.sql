ALTER TABLE "regulations" ALTER COLUMN "publication_date" DROP NOT NULL;
ALTER TABLE "regulation_versions" ALTER COLUMN "publication_date" DROP NOT NULL;
ALTER TABLE "regulations" ADD COLUMN "publication_date_raw" TEXT,
 ADD COLUMN "issuing_offices" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
 ADD COLUMN "official_topics" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
 ADD COLUMN "docket_number" TEXT;
CREATE INDEX "regulations_docket_number_idx" ON "regulations"("docket_number");
