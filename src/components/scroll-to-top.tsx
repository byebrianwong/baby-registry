"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const [bottomOffset, setBottomOffset] = useState(24); // 24px = bottom-6

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);

      const footer = document.querySelector("footer");
      if (footer) {
        const footerRect = footer.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        if (footerRect.top < viewportHeight) {
          setBottomOffset(viewportHeight - footerRect.top + 24);
        } else {
          setBottomOffset(24);
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed z-40 transition-[bottom] duration-200"
      style={{
        bottom: `${bottomOffset}px`,
        right: "max(1rem, calc((100vw - 1280px) / 4))",
      }}
    >
      <Button
        className="!rounded-full !size-14 shadow-lg !bg-brand-200 hover:!bg-brand-300 !ring-brand-200 !text-brand-700"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Scroll to top"
      >
        <ArrowUp className="h-5 w-5" />
      </Button>
    </div>
  );
}
