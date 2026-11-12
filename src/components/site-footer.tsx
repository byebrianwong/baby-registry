import Link from "next/link";

const linkClass = "font-medium text-brand-600 hover:underline";

/** The footer on the home page and the privacy policy. */
export function SiteFooter() {
  return (
    <footer className="border-t py-8">
      <div className="container mx-auto flex flex-col items-center gap-2 px-4 text-center text-sm text-tertiary sm:flex-row sm:justify-center sm:gap-4">
        <span>&copy; {new Date().getFullYear()} Regibee. All rights reserved.</span>
        <Link href="/privacy" className={linkClass}>
          Privacy policy
        </Link>
      </div>
    </footer>
  );
}

/**
 * The footer on pages guests open from a shared link: registries, events and
 * profiles. Guests give their name and email there, so it links the privacy
 * policy too.
 */
export function PoweredByFooter() {
  return (
    <footer className="mt-8 border-t py-6">
      <div className="container mx-auto px-4 text-center text-sm text-tertiary">
        Powered by{" "}
        <Link href="/" className={linkClass}>
          Regibee
        </Link>
        <span aria-hidden="true"> · </span>
        <Link href="/privacy" className={linkClass}>
          Privacy
        </Link>
      </div>
    </footer>
  );
}
