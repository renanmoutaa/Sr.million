-- 1. Drop the function by finding all its overloads and deleting them.
-- A simpler way in Postgres 10+ is just dropping without arguments but sometimes it fails if there are multiple overloads.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT oid::regprocedure AS func_name
        FROM pg_proc
        WHERE proname = 'match_documents'
    ) LOOP
        EXECUTE 'DROP FUNCTION ' || r.func_name || ' CASCADE';
    END LOOP;
END $$;

-- 2. Recreate the precise function for srmilion_docs
create or replace function match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    srmilion_docs.id,
    srmilion_docs.content,
    srmilion_docs.metadata,
    1 - (srmilion_docs.embedding <=> query_embedding) as similarity
  from srmilion_docs
  where 1 - (srmilion_docs.embedding <=> query_embedding) > match_threshold
  order by srmilion_docs.embedding <=> query_embedding
  limit match_count;
$$;
