"use client";

import { useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { BellRinging } from "@phosphor-icons/react";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushToggle() {
  const serverEnabled = useQuery(api.push.pushEnabled, {});
  const save = useMutation(api.push.savePushSubscription);
  const remove = useMutation(api.push.removePushSubscription);
  const clearMine = useMutation(api.push.clearMine);
  const sendTest = useAction(api.push.sendTest);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission | null>(
    null,
  );

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window,
    );
    if (typeof Notification !== "undefined") setPermission(Notification.permission);
    // Re-check when returning to the tab (permission may change in settings).
    const onVis = () => {
      if (typeof Notification !== "undefined") setPermission(Notification.permission);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // If the OS/browser permission was revoked outside the app, the server may
  // still hold a (now-dead) subscription. Reconcile so the UI tells the truth.
  useEffect(() => {
    if (serverEnabled && permission && permission !== "granted") {
      (async () => {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          const sub = await reg?.pushManager.getSubscription();
          if (sub) await sub.unsubscribe();
        } catch {
          /* ignore */
        }
        clearMine({}).catch(() => {});
      })();
    }
  }, [serverEnabled, permission, clearMine]);

  // Only treat push as on when the server has a sub AND permission is granted.
  const enabled = serverEnabled && permission === "granted";
  const blocked = permission === "denied";

  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      if (!supported) throw new Error("Push isn't supported on this browser.");
      if (!vapid) throw new Error("Push isn't configured yet.");
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        throw new Error("Notification permission was not granted.");
      }
      // Make sure a service worker is registered and active. It may not be yet
      // (auto-register only runs in production, and registration is async), so
      // register on demand and wait until it's controlling the page.
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        try {
          reg = await navigator.serviceWorker.register("/sw.js");
        } catch {
          throw new Error(
            "Couldn't start the background service. Make sure you're on https (or have added Liftify to your Home Screen on iPhone), then try again.",
          );
        }
      }
      const ready = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<ServiceWorkerRegistration | null>((resolve) =>
          setTimeout(() => resolve(null), 10_000),
        ),
      ]);
      const active = ready ?? reg;
      const sub = await active.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      });
      const keys = (sub.toJSON().keys ?? {}) as { p256dh: string; auth: string };
      await save({ endpoint: sub.endpoint, p256dh: keys.p256dh, auth: keys.auth });
      // Confirm it works by sending an activation notification.
      try {
        const res = await sendTest({});
        setNote(
          res.configured && res.sent > 0
            ? "Notifications activated — we just sent you one to confirm."
            : "Notifications activated.",
        );
      } catch {
        setNote("Notifications activated.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not enable push.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await remove({ endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not turn off push.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-card border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 font-medium">
        <BellRinging weight="bold" className="size-4 text-accent-strong" />
        Push reminders
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Get your weekly weigh-in reminder on this device — even when the app is
        closed.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {enabled ? (
          <button
            onClick={disable}
            disabled={busy}
            className="rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
          >
            {busy ? "Working…" : "Turn off push"}
          </button>
        ) : (
          <button
            onClick={enable}
            disabled={busy}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-strong disabled:opacity-50"
          >
            {busy ? "Working…" : "Enable push"}
          </button>
        )}
      </div>
      {note && <p className="mt-2 text-sm text-accent-strong">{note}</p>}
      {supported && blocked && (
        <p className="mt-2 text-xs text-muted-foreground">
          Notifications are blocked for Liftify. Re-allow them in your browser /
          device settings, then enable push again.
        </p>
      )}
      {!supported && (
        <p className="mt-2 text-xs text-muted-foreground">
          Not supported here. On iPhone, install Liftify to your Home Screen
          first; on desktop/Android use a supported browser.
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}
