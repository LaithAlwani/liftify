"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useUser } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  House,
  Barbell,
  Scales,
  ChartLineUp,
  Storefront,
  Cards,
  Heart,
  ShieldCheck,
  Megaphone,
  X,
  type Icon,
} from "@phosphor-icons/react";
import { NotificationBell } from "@/components/notification-bell";
import { RestTimerProvider } from "@/components/rest-timer";

// Site-wide announcement banner, controlled from /admin. Dismissal is keyed by
// `updatedAt` so a NEW message re-shows even after a previous one was dismissed.
function AnnouncementBanner() {
  const config = useQuery(api.config.get);
  const [dismissedKey, setDismissedKey] = useState<number | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("liftify:banner-dismissed");
      setDismissedKey(raw ? Number(raw) : null);
    } catch {
      /* ignore */
    }
  }, []);
  if (!config?.bannerActive || !config.bannerText) return null;
  if (dismissedKey === config.updatedAt) return null;
  function dismiss() {
    if (!config) return;
    setDismissedKey(config.updatedAt);
    try {
      localStorage.setItem("liftify:banner-dismissed", String(config.updatedAt));
    } catch {
      /* ignore */
    }
  }
  return (
    <div className="flex items-center gap-3 border-b border-accent/30 bg-accent/10 px-4 py-2.5 text-sm md:pr-28">
      <Megaphone weight="fill" className="size-4 shrink-0 text-accent" />
      <p className="min-w-0 flex-1">{config.bannerText}</p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

const DONATE_URL =
  process.env.NEXT_PUBLIC_DONATE_URL || "https://ko-fi.com/liftify";

// Primary destinations. `label` shows on desktop, `short` in the mobile tab bar.
// Shop lives in the top bar (a passive-monetization link, not a primary tab), so
// the freed slot surfaces Templates on mobile.
type NavItem = {
  href: string;
  label: string;
  short: string;
  icon: Icon;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", short: "HOME", icon: House },
  { href: "/workout/new", label: "Log", short: "LOG", icon: Barbell },
  { href: "/templates", label: "Templates", short: "TEMPLATES", icon: Cards },
  { href: "/body", label: "Body", short: "BODY", icon: Scales },
  { href: "/progress", label: "Progress", short: "PROGRESS", icon: ChartLineUp },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function LiftifyWordmark({ size = "md" }: { size?: "sm" | "md" }) {
  const markSize = size === "sm" ? "size-7" : "size-8";
  const textSize = size === "sm" ? "text-lg" : "text-xl";
  return (
    <Link href="/" className="flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-mark.png" alt="" className={`${markSize} rounded-lg`} />
      <span className={`font-display font-black ${textSize} tracking-tight`}>
        LIFTIFY
      </span>
    </Link>
  );
}

function DonateButton({ className = "" }: { className?: string }) {
  return (
    <a
      href={DONATE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Support Liftify"
      title="Support Liftify"
      className={`flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent/10 hover:text-accent ${className}`}
    >
      <Heart weight="fill" className="size-5" />
    </a>
  );
}

// Gear is a top-bar link (passive monetization + recommendations), not a
// primary tab. Lights up volt when the user is on the Gear page.
function GearButton({ active }: { active: boolean }) {
  return (
    <Link
      href="/gear"
      aria-label="Gear"
      title="Gear"
      aria-current={active ? "page" : undefined}
      className={`flex size-9 items-center justify-center rounded-full transition-colors hover:bg-accent/10 hover:text-accent ${
        active ? "text-accent" : "text-muted-foreground"
      }`}
    >
      <Storefront weight={active ? "fill" : "regular"} className="size-5" />
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useUser();
  const { isAuthenticated } = useConvexAuth();
  const isAdmin = useQuery(api.admin.isAdmin);
  const ensureUser = useMutation(api.users.getOrCreateCurrentUser);
  const setTimezone = useMutation(api.users.setTimezone);

  const initial = (
    user?.firstName?.[0] ??
    user?.primaryEmailAddress?.emailAddress?.[0] ??
    "M"
  ).toUpperCase();

  useEffect(() => {
    if (!isAuthenticated) return;
    ensureUser()
      .then(() =>
        setTimezone({
          // IANA zone keeps reminders DST-correct; offset is a fallback.
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          tzOffset: new Date().getTimezoneOffset(),
        }),
      )
      .catch(() => {});
  }, [isAuthenticated, ensureUser, setTimezone]);

  const settingsActive = pathname.startsWith("/settings");
  const gearActive = pathname.startsWith("/gear");

  // The user's photo (or their initial) — reused in the sidebar row and the
  // mobile top bar.
  const avatarCircle = user?.imageUrl ? (
    <span className="size-8 overflow-hidden rounded-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={user.imageUrl} alt="" className="size-full object-cover" />
    </span>
  ) : (
    <span className="flex size-8 items-center justify-center rounded-full bg-accent font-display text-sm font-black text-accent-foreground">
      {initial}
    </span>
  );

  const accountRow = (
    <Link
      href="/settings"
      className={`m-3 flex items-center gap-3 rounded-field p-2.5 transition-colors ${
        settingsActive ? "bg-accent/10" : "bg-card hover:bg-muted"
      }`}
    >
      {avatarCircle}
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">
          {user?.firstName ?? "Account"}
        </span>
        <span className="mono-label block text-label text-muted-foreground">
          Settings
        </span>
      </span>
    </Link>
  );

  return (
    <RestTimerProvider>
      <div className="flex min-h-full flex-1 flex-col md:pl-64">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-surface-2 px-3.5 py-4.5 md:flex">
          <div className="flex items-center px-2 pb-5">
            <LiftifyWordmark />
          </div>

          <nav className="flex flex-1 flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              const Ico = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-field px-3 py-2.5 text-sm transition-colors ${
                    active
                      ? "bg-accent/10 font-semibold text-accent"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {/* Filled when active for a clear selected state. */}
                  <Ico weight={active ? "fill" : "regular"} className="size-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {isAdmin && (
            <Link
              href="/admin"
              aria-current={pathname.startsWith("/admin") ? "page" : undefined}
              className={`mb-1 flex items-center gap-3 rounded-field px-3 py-2.5 text-sm transition-colors ${
                pathname.startsWith("/admin")
                  ? "bg-accent/10 font-semibold text-accent"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <ShieldCheck
                weight={pathname.startsWith("/admin") ? "fill" : "regular"}
                className="size-5"
              />
              Admin
            </Link>
          )}

          {accountRow}
        </aside>

        {/* Desktop utility icons — pinned to the top-right of the viewport in a
            solid pill so they never bleed over page content beneath them. */}
        <div className="fixed right-6 top-3 z-40 hidden items-center gap-0.5 rounded-full border border-border bg-surface-2/95 px-1.5 py-1 shadow-card backdrop-blur md:flex">
          <GearButton active={gearActive} />
          <DonateButton />
          <NotificationBell />
        </div>

        {/* Mobile top bar — support, notifications, account (desktop uses the sidebar) */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-surface-2 px-4 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] md:hidden">
          <LiftifyWordmark size="sm" />
          <div className="flex items-center gap-0.5">
            <GearButton active={gearActive} />
            <DonateButton />
            <NotificationBell />
            <Link
              href="/settings"
              aria-label="Account and settings"
              className="ml-1 flex items-center"
            >
              {avatarCircle}
            </Link>
          </div>
        </header>

        {/* md:pt-8 clears the fixed top-right utility pill on desktop. */}
        <main className="flex-1 pb-24 md:pb-12 md:pt-8">
          <AnnouncementBanner />
          {children}
        </main>

        {/* Mobile bottom tab bar */}
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-2 md:hidden">
          <div className="mx-auto flex max-w-md items-stretch justify-around pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              const Ico = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex flex-1 flex-col items-center gap-1 pb-1 pt-3 transition-colors ${
                    active ? "text-accent" : "text-dim hover:text-muted-foreground"
                  }`}
                >
                  {/* Volt indicator bar caps the active tab. */}
                  <span
                    className={`absolute top-0 h-0.5 w-8 rounded-full bg-accent transition-opacity ${
                      active ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  <Ico weight={active ? "fill" : "regular"} className="size-6" />
                  <span className="mono-label text-[9px]">{item.short}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </RestTimerProvider>
  );
}
