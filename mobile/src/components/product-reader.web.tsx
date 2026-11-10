// The web preview can't open other sites' pages (browsers block reading
// them across origins), so it skips reading and the owner fills in the form.

import { useEffect } from "react";

import type { ReadProduct } from "@/lib/product";

export function ProductReader({ onResult }: { url: string; onResult: (product: ReadProduct | null) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onResult(null), 400);
    return () => clearTimeout(timer);
  }, [onResult]);
  return null;
}
