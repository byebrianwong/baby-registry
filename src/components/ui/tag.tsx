import { cn } from "@/lib/utils";

type TagVariant = "most-wanted" | "guest-purchased" | "parent-purchased" | "gifted" | "purchased-by-you";

const variantStyles: Record<TagVariant, string> = {
  "most-wanted": "bg-sunshine-400 border-sunshine-400 text-primary",
  "guest-purchased": "bg-sunshine-100 border-sunshine-100 text-primary",
  "parent-purchased": "bg-primary border-sunshine-400 text-primary",
  "gifted": "bg-mint-500 border-mint-500 text-primary",
  "purchased-by-you": "bg-transparent border-mint-500 text-primary",
};

interface TagProps {
  variant: TagVariant;
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function Tag({ variant, children, className, onClick }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        variantStyles[variant],
        className
      )}
      onClick={onClick}
    >
      {children}
    </span>
  );
}
