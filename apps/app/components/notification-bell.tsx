"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Bell, Scales } from "@phosphor-icons/react";

function timeAgo(ms: number) {
  const diff = Date.now() - ms;
  const days = Math.floor(diff / 86_400_000);
  if (days >= 1) return `${days}d ago`;
  const hours = Math.floor(diff / 3_600_000);
  if (hours >= 1) return `${hours}h ago`;
  return "just now";
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const count = useQuery(api.notifications.unreadCount, {}) ?? 0;
  const items = useQuery(api.notifications.listForUser, {}) ?? [];
  const markAllRead = useMutation(api.notifications.markAllRead);

  function toggle() {
    const next = !open;
    setOpen(next);
    // Seeing them clears the badge.
    if (next && count > 0) markAllRead().catch(() => {});
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ""}`}
        className="relative flex size-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
      >
        <Bell weight={count > 0 ? "fill" : "regular"} className="size-5" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-none text-accent-foreground">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* click-away */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-card border border-border bg-card shadow-xl">
            <p className="border-b border-border px-4 py-3 text-sm font-medium">
              Notifications
            </p>
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                You&apos;re all caught up.
              </p>
            ) : (
              <ul className="max-h-80 overflow-y-auto">
                {items.map((n) => (
                  <li key={n._id}>
                    <Link
                      href="/body"
                      onClick={() => setOpen(false)}
                      className="flex gap-3 px-4 py-3 transition-colors hover:bg-muted"
                    >
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent-strong">
                        <Scales className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">
                          {n.title}
                        </span>
                        <span className="block text-sm text-muted-foreground">
                          {n.body}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground/70">
                          {timeAgo(n.createdAt)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
