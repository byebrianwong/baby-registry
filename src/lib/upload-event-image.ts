import { createClient } from "@/utils/supabase/client";
import { EVENT_IMAGES_BUCKET } from "@/lib/event-images";
import { EXTENSIONS, shrinkPhoto, type PhotoUploadResult } from "@/lib/upload-registry-photo";

// Invitations are read up close, often with small print, so they keep more
// detail than registry photos: 1600px on the longer side.
const MAX_SIDE = 1600;

// Drawing a GIF on a canvas keeps only its first frame, so GIFs under this
// size go up as they are and keep their animation.
const MAX_GIF_BYTES = 5 * 1024 * 1024;

/**
 * Uploads an invitation picture to an event's folder and returns its public
 * URL. Runs in the browser as the signed-in user, so only people who can
 * manage the event can upload (see the bucket's rule in 015_events.sql).
 */
export async function uploadEventImage(eventId: string, file: File): Promise<PhotoUploadResult> {
  if (!file.type.startsWith("image/")) {
    return { error: "That file isn't a picture. Choose a JPEG, PNG, WebP or GIF image." };
  }
  const image =
    file.type === "image/gif" && file.size <= MAX_GIF_BYTES ? file : await shrinkPhoto(file, MAX_SIDE);
  const extension = EXTENSIONS[image.type];
  if (!extension) {
    return { error: "That picture's format isn't supported. Choose a JPEG, PNG, WebP or GIF image." };
  }

  const supabase = createClient();
  const path = `${eventId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(EVENT_IMAGES_BUCKET)
    .upload(path, image, { contentType: image.type, cacheControl: "31536000" });
  if (error) {
    return { error: "The picture didn't upload. Try again." };
  }
  const { data } = supabase.storage.from(EVENT_IMAGES_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}
