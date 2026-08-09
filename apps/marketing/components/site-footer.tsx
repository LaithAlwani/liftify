import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="container-page flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="" className="size-7 object-contain" />
          <span className="font-display text-[17px] tracking-[-0.02em]">
            LIFTIFY
          </span>
          <span className="ml-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            Built for lifters
          </span>
        </div>

        <nav className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="transition-colors hover:text-foreground">
            Terms
          </Link>
          <span>© 2026 Liftify</span>
        </nav>
      </div>
    </footer>
  );
}
