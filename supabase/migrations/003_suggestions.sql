-- ============================================================================
-- Suggestions - Allow guests to suggest items for registry owners
-- ============================================================================

create table public.suggestions (
  id                  uuid primary key default gen_random_uuid(),
  registry_id         uuid not null references public.registries(id) on delete cascade,
  title               text not null,
  external_url        text,
  price               decimal,
  notes               text,
  suggested_by_name   text not null,
  suggested_by_email  text,
  status              text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at          timestamptz not null default now()
);

-- Index for querying suggestions by registry
create index idx_suggestions_registry_id on public.suggestions(registry_id);

-- RLS
alter table public.suggestions enable row level security;

-- Anyone can insert a suggestion (public guest endpoint)
create policy "Anyone can suggest items"
  on public.suggestions for insert
  with check (true);

-- Only registry owner can view suggestions
create policy "Registry owner can view suggestions"
  on public.suggestions for select
  using (
    registry_id in (
      select id from public.registries
      where owner_id = auth.uid()
    )
  );

-- Only registry owner can update suggestions (accept/decline)
create policy "Registry owner can update suggestions"
  on public.suggestions for update
  using (
    registry_id in (
      select id from public.registries
      where owner_id = auth.uid()
    )
  );
