import { createClient } from "@/utils/supabase/client";
import { REGISTRY_PHOTOS_BUCKET } from "@/lib/registry-photos";

export type PhotoUploadResult = { url: string } | { error: string };

// Phone photos are often 5 MB or more. Shrinking them to 1200px on the longer
// side keeps most under 300 KB and still looks sharp in the largest place a
// photo shows, the registry header.
const MAX_SIDE = 1200;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

async function shrinkPhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  // A format the browser can't draw goes up as it is. The bucket only takes
  // JPEG, PNG, WebP and GIF, so anything else is refused there.
  if (!bitmap) return file;
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) return file;
  // JPEG has no transparency, so give see-through PNGs a white background
  // instead of black.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", 0.85);
  });
}

/**
 * Uploads a photo to a registry's folder and returns its public URL. Runs in
 * the browser as the signed-in user, so only the registry's managers can
 * upload (see the bucket's access rule in 014_registry_photos.sql).
 */
export async function uploadRegistryPhoto(registryId: string, file: File): Promise<PhotoUploadResult> {
  if (!file.type.startsWith("image/")) {
    return { error: "That file isn't a photo. Choose a JPEG, PNG or WebP image." };
  }
  const photo = await shrinkPhoto(file);
  const extension = EXTENSIONS[photo.type];
  if (!extension) {
    return { error: "That photo's format isn't supported. Choose a JPEG, PNG or WebP image." };
  }

  const supabase = createClient();
  const path = `${registryId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(REGISTRY_PHOTOS_BUCKET)
    .upload(path, photo, { contentType: photo.type, cacheControl: "31536000" });
  if (error) {
    return { error: "The photo didn't upload. Try again, or paste a link to an image." };
  }
  const { data } = supabase.storage.from(REGISTRY_PHOTOS_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}
