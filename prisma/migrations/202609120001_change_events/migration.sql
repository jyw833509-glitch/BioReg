CREATE TABLE "change_events" (
 "id" TEXT PRIMARY KEY,
 "regulation_id" TEXT NOT NULL REFERENCES "regulations"("id") ON DELETE RESTRICT,
 "previous_version_id" TEXT REFERENCES "regulation_versions"("id") ON DELETE RESTRICT,
 "current_version_id" TEXT NOT NULL UNIQUE REFERENCES "regulation_versions"("id") ON DELETE RESTRICT,
 "detected_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "change_types" TEXT[] NOT NULL,
 "changed_fields" JSONB NOT NULL,
 "sections" JSONB NOT NULL,
 "change_summary" TEXT NOT NULL,
 "severity" "Importance" NOT NULL
);
CREATE INDEX "change_events_regulation_id_detected_at_idx" ON "change_events"("regulation_id","detected_at" DESC);
CREATE INDEX "change_events_detected_at_idx" ON "change_events"("detected_at" DESC);
CREATE FUNCTION enforce_change_event_chain() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM regulation_versions v WHERE v.id=NEW.current_version_id AND v.regulation_id=NEW.regulation_id AND v.previous_version_id IS NOT DISTINCT FROM NEW.previous_version_id) THEN
  RAISE EXCEPTION 'Change event version chain mismatch';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER change_event_chain BEFORE INSERT ON change_events FOR EACH ROW EXECUTE FUNCTION enforce_change_event_chain();
CREATE FUNCTION immutable_change_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Change events are immutable'; END $$;
CREATE TRIGGER change_event_immutable BEFORE UPDATE OR DELETE ON change_events FOR EACH ROW EXECUTE FUNCTION immutable_change_event();
