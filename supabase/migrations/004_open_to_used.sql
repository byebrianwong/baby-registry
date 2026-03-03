-- Add "open to used" fields to registry_items
alter table public.registry_items
  add column is_open_to_used boolean not null default false,
  add column minimum_condition text;
