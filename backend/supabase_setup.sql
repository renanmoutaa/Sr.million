# Supabase RAG SQL Setup
# Run this entire block in the Supabase SQL Editor:
# https://supabase.com/dashboard/project/smiwcaaqggqkuqgatjam/sql/new

-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create a table to store your documents
create table if not exists srmilion_docs (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  metadata jsonb,
  embedding vector(1536) -- 1536 is the dimension of OpenAI text-embedding-3-small
);

-- Create a function to search for documents
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

-- Create an index to speed up vector searches (optional but recommended)
create index if not exists srmilion_docs_embedding_idx on srmilion_docs using ivfflat (embedding vector_cosine_ops)
with (lists = 100);
