import { cn } from "@/lib/utils";

const conditionColors: Record<string, { border: string; badge: string }> = {
  "like-new": { border: "border-[#f9b8b9]", badge: "bg-[#f9b8b9]" },
  "very-good": { border: "border-[#f7efa9]", badge: "bg-[#f7efa9]" },
  "good": { border: "border-[#a0e4d4]", badge: "bg-[#a0e4d4]" },
  "acceptable": { border: "border-[#9db6bd]", badge: "bg-[#9db6bd]" },
};

interface UsedConditionTagProps {
  condition: string | null;
  className?: string;
}

export function UsedConditionTag({ condition, className }: UsedConditionTagProps) {
  const key = condition || "like-new";
  const colors = conditionColors[key] || conditionColors["like-new"];
  const label = key.replace("-", " ");

  const fullText = `Open to ${label} used condition`;

  return (
    <span
      className={cn(
        "group relative inline-flex max-w-full",
        className
      )}
    >
      <span
        className={cn(
          "inline-flex max-w-full items-center gap-1 overflow-hidden whitespace-nowrap rounded-full border bg-[#fdfdfd] px-2.5 py-0.5 text-xs font-medium text-[#181d27]",
          colors.border
        )}
      >
        <span className="shrink-0">Open to</span>
        <span className={cn("inline-flex shrink-0 items-center rounded px-1.5", colors.badge)}>
          {label}
        </span>
        <span className="min-w-0 truncate">used condition</span>
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#181d27] px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
      >
        {fullText}
      </span>
    </span>
  );
}
