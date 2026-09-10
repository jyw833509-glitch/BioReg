ALTER TABLE "regulations" ADD COLUMN "source_metadata" JSONB NOT NULL DEFAULT '{}',
 ADD COLUMN "attachment_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
