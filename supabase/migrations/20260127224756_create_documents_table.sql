-- Enable pgvector extension for embeddings
create extension if not exists vector;

-- Documents table for RAG (AI Trainer knowledge base)
create table documents (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  embedding vector(1536),
  category text,
  video_id text,
  created_at timestamp with time zone default now()
);

-- Index for fast similarity search
create index on documents using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Function to search documents by similarity
create or replace function match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  title text,
  content text,
  category text,
  video_id text,
  similarity float
)
language sql stable
as $$
  select
    id,
    title,
    content,
    category,
    video_id,
    1 - (embedding <=> query_embedding) as similarity
  from documents
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- RLS for documents (public read, admin write)
alter table documents enable row level security;

-- Anyone authenticated can read documents
create policy "Authenticated users can read documents"
  on documents for select
  to authenticated
  using (true);

-- Service role can manage documents
create policy "Service role can manage documents"
  on documents for all
  using (true)
  with check (true);
