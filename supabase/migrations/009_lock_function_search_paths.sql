-- Pin search_path on app SQL functions to defeat the
-- "Function Search Path Mutable" advisor warning. Without this, a malicious
-- caller could create objects in their search_path that override the
-- intended ones inside the function body.
--
-- Already applied to the live project via the Supabase MCP migration tool.
-- This file exists so the change is tracked in source control alongside
-- the rest of the schema.

alter function public.auth_firm_id() set search_path = public, pg_temp;
alter function public.set_updated_at() set search_path = public, pg_temp;
alter function public.match_document_chunks(vector, integer, uuid, uuid, uuid) set search_path = public, pg_temp;
alter function public.search_document_chunks_text(text, uuid, uuid, integer) set search_path = public, pg_temp;
