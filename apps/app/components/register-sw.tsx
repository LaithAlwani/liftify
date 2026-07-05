"use client";

import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // In dev, make sure no stale service worker is intercepting requests.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations?.()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {});
      return;
    }

    const { protocol, hostname } = window.location;
    const secureContext =
      protocol === "https:" ||
      hostname === "localhost" ||
      hostname.endsWith(".localhost");
    if (!secureContext) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* registration is best-effort */
    });
  }, []);

  return null;
}
