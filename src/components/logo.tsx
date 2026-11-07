import { PandaMark } from "@/components/panda-mark";
import { cx } from "@/lib/utils/cx";

// The Regibee logo: the panda and the wordmark. Put it inside the link that
// goes home; the wordmark text gives that link its accessible name.
// "md" is for page headers, "lg" for the centered logo above auth forms.
export function Logo({ size = "md", className }: { size?: "md" | "lg"; className?: string }) {
  return (
    <span className={cx("inline-flex items-center", size === "lg" ? "gap-2.5" : "gap-2", className)}>
      <PandaMark className={cx("w-auto shrink-0", size === "lg" ? "h-11" : "h-9")} />
      <span
        className={cx(
          "font-display font-bold tracking-tight text-brand-600",
          size === "lg" ? "text-2xl" : "text-lg",
        )}
      >
        Regibee
      </span>
    </span>
  );
}
