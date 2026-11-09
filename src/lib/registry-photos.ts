// Photos managers upload: item photos, and the registry's own photo
// (registries.photo_url). They live in a public Supabase Storage bucket, in a
// folder named for the registry. supabase/migrations/014_registry_photos.sql
// makes the bucket and lets managers upload to their registries' folders.

export const REGISTRY_PHOTOS_BUCKET = "registry-photos";

/** The start of every public URL for a registry's photos. */
export function registryPhotoUrlPrefix(registryId: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${REGISTRY_PHOTOS_BUCKET}/${registryId}/`;
}
