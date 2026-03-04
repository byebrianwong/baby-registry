import { cn } from "@/lib/utils";

type TagVariant = "most-wanted" | "guest-purchased" | "parent-purchased" | "gifted" | "purchased-by-you";

const variantStyles: Record<TagVariant, string> = {
  "most-wanted": "bg-[#fae421] border-[#fae421] text-[#181d27]",
  "guest-purchased": "bg-[#f7efa9] border-[#f7efa9] text-[#181d27]",
  "parent-purchased": "bg-[#fdfdfd] border-[#fae421] text-[#181d27]",
  "gifted": "bg-[#09c69a] border-[#09c69a] text-[#181d27]",
  "purchased-by-you": "bg-transparent border-[#09c69a] text-[#181d27]",
};

interface TagProps {
  variant: TagVariant;
  children: React.ReactNode;
  className?: string;
}

export function Tag({ variant, children, className }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
