"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PhotoUploadResult } from "@/lib/upload-registry-photo";

interface PhotoUploadButtonProps {
  /** Uploads the chosen file. The site passes uploadRegistryPhoto; the demo makes a local URL. */
  upload: (file: File) => Promise<PhotoUploadResult>;
  onUploaded: (url: string) => void;
  /** Called with a message when an upload fails, and with null when a new one starts. */
  onError: (message: string | null) => void;
  label?: string;
}

/** A button that opens the file picker (or the camera, on phones) and uploads the photo picked. */
export function PhotoUploadButton({
  upload,
  onUploaded,
  onError,
  label = "Upload photo",
}: PhotoUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Clear the input, so picking the same file again still uploads it.
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    onError(null);
    const result = await upload(file);
    if ("error" in result) {
      onError(result.error);
    } else {
      onUploaded(result.url);
    }
    setUploading(false);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleChange}
      />
      <Button
        type="button"
        variant="outline"
        // As tall as a text input, so it lines up beside one.
        className="h-10"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        <span className="inline-flex items-center gap-1.5">
          {uploading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4 shrink-0" />
          )}
          {uploading ? "Uploading…" : label}
        </span>
      </Button>
    </>
  );
}
