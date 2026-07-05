import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { NAV_LINKS, SIGN_IN_URL, SIGN_UP_URL } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container-page flex h-[72px] items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="" className="size-9 object-contain" />
          <span className="font-display text-xl tracking-[-0.03em]">LIFTIFY</span>
        </Link>

        <nav className="hidden items-center gap-8 font-mono text-xs uppercase tracking-[0.12em] text-subtle sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <a
            href={SIGN_IN_URL}
            rel="noopener noreferrer"
            className="hidden font-mono text-xs uppercase tracking-[0.08em] text-subtle transition-colors hover:text-foreground sm:block"
          >
            Sign in
          </a>
          <a
            href={SIGN_UP_URL}
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 font-display text-sm not-italic text-accent-foreground transition-[filter] hover:brightness-105"
          >
            Get started
            <ArrowRight weight="bold" className="size-3.5" />
          </a>
        </div>
      </div>
    </header>
  );
}
