"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { DeviceMobile, Export, X } from "@phosphor-icons/react";

// The `beforeinstallprompt` event isn't in the standard DOM types yet.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Remembers a home-banner dismissal so we don't nag every visit.
const DISMISS_KEY = "liftify:install-dismissed";

// --- Global install-prompt capture ------------------------------------------
// `beforeinstallprompt` fires once, early — often before a given <InstallPrompt/>
// (e.g. deep in the onboarding flow) has mounted. So we capture it at module
// load and share it with every instance via a tiny external store, instead of
// each component listening only while it happens to be mounted.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const storeListeners = new Set<() => void>();

function emitChange() {
  for (const listener of storeListeners) listener();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Stop Chrome's mini-infobar so we can trigger the prompt from our button.
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    emitChange();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    emitChange();
  });
}

function subscribeToPrompt(listener: () => void) {
  storeListeners.add(listener);
  return () => storeListeners.delete(listener);
}

function useInstallEvent() {
  return useSyncExternalStore(
    subscribeToPrompt,
    () => deferredPrompt,
    () => null, // server snapshot
  );
}
// ----------------------------------------------------------------------------

// Already running as an installed PWA? (standalone display, or iOS home-screen)
export function getIsStandalone() {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean })
    .standalone;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    iosStandalone === true
  );
}

export function getIsIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// Encourages installing the PWA so push reminders reach a closed app / locked
// phone (on iOS, web push only works once added to the Home Screen). Renders
// nothing when already installed, dismissed, or on a browser that can't install.
//   - Android / Chrome / desktop → a real "Install" button (native prompt).
//   - iOS Safari → manual "Add to Home Screen" instructions (no prompt API).
export function InstallPrompt({
  dismissible = false,
  compact = false,
}: {
  dismissible?: boolean;
  // A slim, single-row variant — used as the onboarding header so it doesn't
  // tower over the first question (especially the multi-line iOS hint).
  compact?: boolean;
}) {
  const installEvent = useInstallEvent();
  // Assume installed until the client check runs, so the banner never flashes
  // during SSR / before hydration.
  const [standalone, setStandalone] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const isIOS = getIsIOS();

  useEffect(() => {
    setStandalone(getIsStandalone());
    if (dismissible) {
      try {
        setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
      } catch {
        /* ignore */
      }
    }
  }, [dismissible]);

  // Nothing to encourage if it's already installed or the user dismissed it.
  if (standalone || dismissed) return null;
  // Only show where we can actually guide an install: a captured native prompt
  // or iOS Safari. Other browsers (e.g. Firefox) can't install a PWA.
  if (!installEvent && !isIOS) return null;

  function handleDismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    // A prompt can only be used once — clear it and let instances hide.
    deferredPrompt = null;
    emitChange();
  }

  // Slim single-row variant for tight spots (onboarding header).
  if (compact) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-accent/40 bg-accent/[0.06] px-3 py-2.5">
        <DeviceMobile weight="fill" className="size-4 shrink-0 text-accent" />
        {installEvent ? (
          <p className="min-w-0 flex-1 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Install Liftify</span>{" "}
            for reminders even when it&apos;s closed.
          </p>
        ) : (
          <p className="min-w-0 flex-1 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Add to Home Screen</span>
            {" — tap "}
            <Export
              weight="bold"
              className="inline size-3.5 align-text-bottom text-foreground"
            />{" "}
            Share, then Add to Home Screen.
          </p>
        )}
        {installEvent && (
          <button
            type="button"
            onClick={handleInstall}
            className="shrink-0 rounded-lg bg-accent px-3 py-1.5 font-display text-xs font-black italic tracking-tight text-accent-foreground transition hover:brightness-105"
          >
            Install
          </button>
        )}
        {dismissible && (
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X weight="bold" className="size-4" />
          </button>
        )}
      </div>
    );
  }

  const cardStyles =
    "flex flex-col gap-3 rounded-[14px] border border-accent/40 bg-accent/[0.06] p-4";
  const installButtonStyles =
    "shrink-0 rounded-xl bg-accent px-3.5 py-2 font-display text-sm font-black italic tracking-tight text-accent-foreground transition hover:brightness-105";

  return (
    <div className={cardStyles}>
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
          <DeviceMobile weight="fill" className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-extrabold">Install Liftify</p>
          <p className="text-xs text-muted-foreground">
            Add it to your home screen to get workout reminders even when the app
            is closed.
          </p>
        </div>
        {installEvent && (
          <button
            type="button"
            onClick={handleInstall}
            className={installButtonStyles}
          >
            Install
          </button>
        )}
        {dismissible && (
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X weight="bold" className="size-4" />
          </button>
        )}
      </div>

      {/* iOS has no install prompt API — walk them through the Share sheet. */}
      {!installEvent && isIOS && (
        <p className="flex flex-wrap items-center gap-1.5 rounded-xl bg-surface-3 px-3 py-2 text-xs text-muted-foreground">
          Tap
          <Export weight="bold" className="size-4 text-foreground" />
          <span className="font-semibold text-foreground">Share</span>, then
          <span className="font-semibold text-foreground">
            Add to Home Screen
          </span>
          .
        </p>
      )}
    </div>
  );
}
