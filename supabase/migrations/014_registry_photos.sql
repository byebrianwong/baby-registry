-- ============================================================================
-- Photos managers upload
-- ============================================================================
-- Managers can upload a photo for an item, for gifts with no product page to
-- take one from, like handmade or secondhand things. They can also upload a
-- photo for the registry itself (registries.photo_url), which the public
-- registry page shows in its header.
--
-- Files go in a public bucket, in a folder named for the registry:
--   registry-photos/<registry id>/<random id>.jpg
-- Public, because the public registry page shows them to anyone with the link.
-- The random file names keep them from being guessed.
--
-- Only a registry's managers can upload to its folder. There's no update or
-- delete rule: the site never overwrites a file, it uploads a new one.
--
-- Safe to run more than once.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'registry-photos',
  'registry-photos',
  true,
  5242880, -- 5 MB. The site shrinks photos before upload, so most are far smaller.
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

drop policy if exists "Managers can upload registry photos" on storage.objects;
create policy "Managers can upload registry photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'registry-photos'
    and public.is_registry_manager(
      -- The first folder is the registry id. The case turns anything that
      -- isn't a uuid into null, which no registry matches, instead of a cast
      -- error.
      case
        when (storage.foldername(name))[1]
          ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then ((storage.foldername(name))[1])::uuid
      end,
      (select auth.uid())
    )
  );
