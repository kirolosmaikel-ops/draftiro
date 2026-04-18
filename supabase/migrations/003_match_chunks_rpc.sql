-- ── Vector similarity search RPC ──────────────────────────────────────────
-- Called by /api/chat/stream to retrieve relevant chunks for RAG.
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding     vector(1536),
  match_count         int             DEFAULT 6,
  filter_document_id  uuid            DEFAULT NULL,
  filter_case_id      uuid            DEFAULT NULL
)
RETURNS TABLE (
  id           uuid,
  document_id  uuid,
  content      text,
  page_number  int,
  similarity   float
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    dc.page_number,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  WHERE
    (filter_document_id IS NULL OR dc.document_id = filter_document_id)
    AND (filter_case_id IS NULL OR d.case_id = filter_case_id)
    -- Row-level security: only chunks from the caller's firm
    AND dc.firm_id = auth_firm_id()
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
