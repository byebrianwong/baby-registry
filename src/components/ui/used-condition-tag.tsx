import { cn } from "@/lib/utils";

const conditionColors: Record<string, { border: string; badge: string }> = {
  "like-new": { border: "border-blush-200", badge: "bg-blush-200" },
  "very-good": { border: "border-sunshine-100", badge: "bg-sunshine-100" },
  "good": { border: "border-mint-200", badge: "bg-mint-200" },
  "acceptable": { border: "border-brand-300", badge: "bg-brand-300" },
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
          "inline-flex max-w-full items-center gap-1 overflow-hidden whitespace-nowrap rounded-full border bg-primary px-2.5 py-0.5 text-xs font-medium text-primary",
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
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
      >
        {fullText}
      </span>
    </span>
  );
}
