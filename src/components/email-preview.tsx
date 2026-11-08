"use client";

import { useRef, useState } from "react";

interface EmailPreviewProps {
  html: string;
  subject: string;
  from?: string;
  to?: string;
}

export function EmailPreview({
  html,
  subject,
  from = "Regibee <notifications@regibee.com>",
  to = "glinda@example.com",
}: EmailPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(300);

  const fullHtml = `<!DOCTYPE html>
<html><head><style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 24px; color: #333; line-height: 1.6; font-size: 14px; }
a { color: #004659; }
</style></head><body>${html}</body></html>`;

  const handleLoad = () => {
    try {
      const body = iframeRef.current?.contentDocument?.body;
      if (body) setHeight(body.scrollHeight + 40);
    } catch {
      // cross-origin fallback
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <div
        style={{
          padding: "12px 16px",
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: "8px 8px 0 0",
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{subject}</div>
        <div style={{ fontSize: 13, color: "#6b7280" }}>From: {from}</div>
        <div style={{ fontSize: 13, color: "#6b7280" }}>To: {to}</div>
      </div>
      <iframe
        ref={iframeRef}
        srcDoc={fullHtml}
        onLoad={handleLoad}
        style={{
          width: "100%",
          height,
          border: "1px solid #e5e7eb",
          borderTop: "none",
          borderRadius: "0 0 8px 8px",
        }}
        title={subject}
      />
    </div>
  );
}
