-- Drop existing functions to avoid the "Multiple Choices" error in the API
drop function if exists match_documents(vector(1536), float, int);
drop function if exists match_documents(query_embedding vector(1536), match_threshold float, match_count int);

-- Recreate the correct function pointing to srmilion_docs
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
