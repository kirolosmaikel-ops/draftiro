-- Fix match_document_chunks to accept an explicit firm_id override.
-- When called from a service-role context, auth.uid() = NULL so auth_firm_id()
-- returns NULL and the WHERE clause never matches. Passing filter_firm_id bypasses that.
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding     vector(1536),
  match_count         int             DEFAULT 6,
  filter_document_id  uuid            DEFAULT NULL,
  filter_case_id      uuid            DEFAULT NULL,
  filter_firm_id      uuid            DEFAULT NULL
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
DECLARE
  resolved_firm_id uuid;
BEGIN
  -- Use explicit firm_id when provided (service-role callers), fall back to session user
  resolved_firm_id := COALESCE(filter_firm_id, auth_firm_id());

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
    resolved_firm_id IS NOT NULL
    AND dc.firm_id = resolved_firm_id
    AND (filter_document_id IS NULL OR dc.document_id = filter_document_id)
    AND (filter_case_id IS NULL OR d.case_id = filter_case_id)
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
