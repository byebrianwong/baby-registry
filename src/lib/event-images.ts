// Invitation pictures live in a public Supabase Storage bucket, in a folder
// named for the event. supabase/migrations/015_events.sql makes the bucket and
// lets people who manage an event upload to its folder.

export const EVENT_IMAGES_BUCKET = "event-images";

/** The start of every public URL for an event's pictures. */
export function eventImageUrlPrefix(eventId: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${EVENT_IMAGES_BUCKET}/${eventId}/`;
}
