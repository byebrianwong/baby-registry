"use client";

import { useState } from "react";
import { Input } from "@/components/base/input/input";
import { PhotoUploadButton } from "@/components/photo-upload-button";
import type { PhotoUploadResult } from "@/lib/upload-registry-photo";

interface ItemImageFieldProps {
  value: string;
  onChange: (url: string) => void;
  upload: (file: File) => Promise<PhotoUploadResult>;
}

/**
 * An item's image: a link to one, or a photo the owner uploads. Uploading
 * covers things with no product page to take a picture from, like handmade
 * or secondhand gifts. Submits as the form's imageUrl field.
 */
export function ItemImageField({ value, onChange, upload }: ItemImageFieldProps) {
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  return (
    <div className="space-y-1.5">
      <div className="flex items-end gap-2">
        <Input
          label="Image link (optional)"
          name="imageUrl"
          placeholder="https://www.example.com/photo.jpg"
          value={value}
          onChange={(url) => {
            onChange(url);
            setUploadError(null);
          }}
          className="min-w-0 flex-1"
        />
        <PhotoUploadButton upload={upload} onUploaded={onChange} onError={setUploadError} />
      </div>
      {uploadError && <p className="text-xs text-error-primary">{uploadError}</p>}
      {value && value !== brokenUrl && (
        <div className="flex size-16 items-center justify-center rounded-lg bg-tertiary">
          <img
            src={value}
            alt="Preview"
            className="size-16 rounded-lg object-cover"
            onError={() => setBrokenUrl(value)}
          />
        </div>
      )}
    </div>
  );
}
