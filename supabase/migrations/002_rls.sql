-- ── Enable RLS on all tables ────────────────────────────────────────────────
ALTER TABLE firms            ENABLE ROW LEVEL SECURITY;
ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases            ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages    ENABLE ROW LEVEL SECURITY;

-- ── Helper function ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION auth_firm_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT firm_id FROM users WHERE id = auth.uid()
$$;

-- ── FIRMS ───────────────────────────────────────────────────────────────────
CREATE POLICY "firms_select_own"  ON firms FOR SELECT USING (id = auth_firm_id());
CREATE POLICY "firms_update_own"  ON firms FOR UPDATE USING (id = auth_firm_id());

-- ── USERS ───────────────────────────────────────────────────────────────────
CREATE POLICY "users_select_same_firm"  ON users FOR SELECT  USING (firm_id = auth_firm_id());
CREATE POLICY "users_insert_self"       ON users FOR INSERT  WITH CHECK (id = auth.uid());
CREATE POLICY "users_update_self"       ON users FOR UPDATE  USING (id = auth.uid());
CREATE POLICY "users_delete_self"       ON users FOR DELETE  USING (id = auth.uid());

-- ── CLIENTS ─────────────────────────────────────────────────────────────────
CREATE POLICY "clients_select_firm"  ON clients FOR SELECT  USING (firm_id = auth_firm_id());
CREATE POLICY "clients_insert_firm"  ON clients FOR INSERT  WITH CHECK (firm_id = auth_firm_id());
CREATE POLICY "clients_update_firm"  ON clients FOR UPDATE  USING (firm_id = auth_firm_id());
CREATE POLICY "clients_delete_firm"  ON clients FOR DELETE  USING (firm_id = auth_firm_id());

-- ── CASES ───────────────────────────────────────────────────────────────────
CREATE POLICY "cases_select_firm"  ON cases FOR SELECT  USING (firm_id = auth_firm_id());
CREATE POLICY "cases_insert_firm"  ON cases FOR INSERT  WITH CHECK (firm_id = auth_firm_id());
CREATE POLICY "cases_update_firm"  ON cases FOR UPDATE  USING (firm_id = auth_firm_id());
CREATE POLICY "cases_delete_firm"  ON cases FOR DELETE  USING (firm_id = auth_firm_id());

-- ── DOCUMENTS ───────────────────────────────────────────────────────────────
CREATE POLICY "documents_select_firm"  ON documents FOR SELECT  USING (firm_id = auth_firm_id());
CREATE POLICY "documents_insert_firm"  ON documents FOR INSERT  WITH CHECK (firm_id = auth_firm_id());
CREATE POLICY "documents_update_firm"  ON documents FOR UPDATE  USING (firm_id = auth_firm_id());
CREATE POLICY "documents_delete_firm"  ON documents FOR DELETE  USING (firm_id = auth_firm_id());

-- ── DOCUMENT CHUNKS ─────────────────────────────────────────────────────────
CREATE POLICY "chunks_select_firm"  ON document_chunks FOR SELECT  USING (firm_id = auth_firm_id());
CREATE POLICY "chunks_insert_firm"  ON document_chunks FOR INSERT  WITH CHECK (firm_id = auth_firm_id());
CREATE POLICY "chunks_update_firm"  ON document_chunks FOR UPDATE  USING (firm_id = auth_firm_id());
CREATE POLICY "chunks_delete_firm"  ON document_chunks FOR DELETE  USING (firm_id = auth_firm_id());

-- ── CHAT SESSIONS ───────────────────────────────────────────────────────────
CREATE POLICY "sessions_select_firm"   ON chat_sessions FOR SELECT  USING (firm_id = auth_firm_id());
CREATE POLICY "sessions_insert_firm"   ON chat_sessions FOR INSERT  WITH CHECK (firm_id = auth_firm_id() AND user_id = auth.uid());
CREATE POLICY "sessions_update_own"    ON chat_sessions FOR UPDATE  USING (user_id = auth.uid());
CREATE POLICY "sessions_delete_own"    ON chat_sessions FOR DELETE  USING (user_id = auth.uid());

-- ── CHAT MESSAGES ───────────────────────────────────────────────────────────
CREATE POLICY "messages_select_firm"  ON chat_messages FOR SELECT  USING (firm_id = auth_firm_id());
CREATE POLICY "messages_insert_firm"  ON chat_messages FOR INSERT  WITH CHECK (firm_id = auth_firm_id());
CREATE POLICY "messages_update_firm"  ON chat_messages FOR UPDATE  USING (firm_id = auth_firm_id());
CREATE POLICY "messages_delete_firm"  ON chat_messages FOR DELETE  USING (firm_id = auth_firm_id());
