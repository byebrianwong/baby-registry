"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface CelebrationDialogProps {
  open: boolean;
  onClose: () => void;
  itemTitle: string;
  parentName: string;
  variant: "reserve" | "cover" | "contribute";
  amount?: number;
}

function getMessage(
  variant: CelebrationDialogProps["variant"],
  itemTitle: string,
  parentName: string,
  amount?: number
) {
  switch (variant) {
    case "reserve":
      return `You're gifting "${itemTitle}"! ${parentName} thanks you so much. ❤️`;
    case "cover":
      return `You're covering "${itemTitle}"! ${parentName} thanks you so much. ❤️`;
    case "contribute":
      return `You contributed $${amount} to "${itemTitle}"! ${parentName} thanks you so much. ❤️`;
  }
}

export function CelebrationDialog({
  open,
  onClose,
  itemTitle,
  parentName,
  variant,
  amount,
}: CelebrationDialogProps) {
  useEffect(() => {
    if (!open) return;

    const defaults = {
      spread: 60,
      ticks: 100,
      gravity: 0.8,
      decay: 0.94,
      startVelocity: 30,
      colors: ["#09c69a", "#004659", "#fbbf24", "#f472b6", "#60a5fa"],
    };

    // Fire from left
    confetti({ ...defaults, particleCount: 40, origin: { x: 0.2, y: 0.6 }, angle: 60 });
    // Fire from right
    confetti({ ...defaults, particleCount: 40, origin: { x: 0.8, y: 0.6 }, angle: 120 });
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent showCloseButton={false} className="text-center sm:max-w-sm">
        <div className="flex flex-col items-center gap-4 py-2">
          <img
            src="/hero/panda.svg"
            alt="Celebration panda"
            className="h-28 w-28"
            style={{ animation: "celebration-bounce 1.2s ease-in-out infinite" }}
          />
          <h2
            className="text-xl font-bold text-[#181d27]"
            style={{ animation: "celebration-fade-in 0.5s ease-out 0.2s both" }}
          >
            Thank you!
          </h2>
          <p
            className="text-[#414651]"
            style={{ animation: "celebration-fade-in 0.5s ease-out 0.4s both" }}
          >
            {getMessage(variant, itemTitle, parentName, amount)}
          </p>
          <Button
            onClick={onClose}
            className="!bg-[#004659] hover:!bg-[#003847] !ring-[#004659] !text-white mt-2"
            style={{ animation: "celebration-fade-in 0.5s ease-out 0.6s both" }}
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
