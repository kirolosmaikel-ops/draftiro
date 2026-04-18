-- ── DRAFTS table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drafts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firm_id     UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  case_id     UUID REFERENCES cases(id) ON DELETE SET NULL,
  title       TEXT NOT NULL DEFAULT 'Untitled Draft',
  content     TEXT NOT NULL DEFAULT '',
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Updated-at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER drafts_updated_at
  BEFORE UPDATE ON drafts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drafts_select_firm"  ON drafts FOR SELECT  USING (firm_id = auth_firm_id());
CREATE POLICY "drafts_insert_firm"  ON drafts FOR INSERT  WITH CHECK (firm_id = auth_firm_id());
CREATE POLICY "drafts_update_own"   ON drafts FOR UPDATE  USING (created_by = auth.uid());
CREATE POLICY "drafts_delete_own"   ON drafts FOR DELETE  USING (created_by = auth.uid());

-- Index for fast lookup by firm / user
CREATE INDEX ON drafts (firm_id, updated_at DESC);
CREATE INDEX ON drafts (created_by);
