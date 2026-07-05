"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useUser } from "@clerk/nextjs";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  House,
  Barbell,
  Scales,
  ChartLineUp,
  Storefront,
  Cards,
  Heart,
  type Icon,
} from "@phosphor-icons/react";
import { NotificationBell } from "@/components/notification-bell";
import { RestTimerProvider } from "@/components/rest-timer";

const DONATE_URL =
  process.env.NEXT_PUBLIC_DONATE_URL || "https://ko-fi.com/liftify";

// Nav items are data so they are easy to edit. `label` shows on desktop,
// `short` shows in the mobile tab bar (matching the design's terse caps).
// `desktopOnly` items appear only in the sidebar — the mobile tab bar is full
// at 5 items, so those are reached from the Home page instead.
type NavItem = {
  href: string;
  label: string;
  short: string;
  icon: Icon;
  desktopOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", short: "HOME", icon: House },
  { href: "/workout/new", label: "Log", short: "LOG", icon: Barbell },
  { href: "/templates", label: "Templates", short: "PLANS", icon: Cards, desktopOnly: true },
  { href: "/body", label: "Body", short: "BODY", icon: Scales },
  { href: "/progress", label: "Progress", short: "PROGRESS", icon: ChartLineUp },
  { href: "/shop", label: "Shop", short: "SHOP", icon: Storefront },
];

const MOBILE_NAV_ITEMS = NAV_ITEMS.filter((item) => !item.desktopOnly);

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

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useUser();
  const { isAuthenticated } = useConvexAuth();
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
      className={`m-3 flex items-center gap-3 rounded-xl p-2.5 transition-colors ${
        settingsActive ? "bg-accent/10" : "bg-card hover:bg-muted"
      }`}
    >
      {avatarCircle}
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">
          {user?.firstName ?? "Account"}
        </span>
        <span className="mono-label block text-[10px] text-muted-foreground">
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
          <div className="flex items-center justify-between px-2 pb-5">
            <LiftifyWordmark />
            <div className="flex items-center">
              <DonateButton />
              <NotificationBell />
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              const Ico = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm transition-colors ${
                    active
                      ? "bg-accent/10 font-semibold text-accent"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {/* Outlined icon even when active — matches the mobile tab bar. */}
                  <Ico weight="regular" className="size-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {accountRow}
        </aside>

        {/* Mobile top bar — support, notifications, account (desktop uses the sidebar) */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-surface-2 px-4 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] md:hidden">
          <LiftifyWordmark size="sm" />
          <div className="flex items-center gap-0.5">
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

        <main className="flex-1 pb-24 md:pb-12">{children}</main>

        {/* Mobile bottom tab bar */}
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-2 md:hidden">
          <div className="mx-auto flex max-w-md items-stretch justify-around pb-[max(1rem,env(safe-area-inset-bottom))] pt-2.5">
            {MOBILE_NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              const Ico = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-1 flex-col items-center gap-1 ${
                    active ? "text-accent" : "text-dim"
                  }`}
                >
                  {/* Active tab stays outlined (regular weight), just tinted volt. */}
                  <Ico weight="regular" className="size-6" />
                  <span className="mono-label text-[8px]">{item.short}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </RestTimerProvider>
  );
}
