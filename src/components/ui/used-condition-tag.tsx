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

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border bg-[#fdfdfd] px-2.5 py-1 text-xs font-medium text-[#181d27] whitespace-nowrap",
        colors.border,
        className
      )}
    >
      Open to
      <span className={cn("rounded px-1", colors.badge)}>
        {label}
      </span>
      used condition
    </span>
  );
}
