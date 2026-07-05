"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Timer } from "@phosphor-icons/react";

const STORAGE_KEY = "liftify:rest-ends-at";
const PUSH_KEY = "liftify:rest-push-id";

function fmtClock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function beep() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
    o.start();
    o.stop(ctx.currentTime + 0.45);
    o.onended = () => ctx.close();
  } catch {
    /* audio unavailable */
  }
}

// Five buzzes (200ms) separated by short pauses.
const DONE_VIBRATION = [200, 140, 200, 140, 200, 140, 200, 140, 200];

type RestApi = {
  remaining: number | null;
  start: (sec: number) => void;
  adjust: (delta: number) => void;
  stop: () => void;
};

const RestContext = createContext<RestApi | null>(null);

export function useRest() {
  const ctx = useContext(RestContext);
  if (!ctx) throw new Error("useRest must be used within <RestTimerProvider>");
  return ctx;
}

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const firedRef = useRef(false);
  const endsAtRef = useRef<number | null>(null);
  const pushIdRef = useRef<string | null>(null);
  const scheduleMut = useMutation(api.push.scheduleRestDone);
  const cancelMut = useMutation(api.push.cancelScheduled);

  useEffect(() => {
    endsAtRef.current = endsAt;
  }, [endsAt]);

  // Cancel a pending "rest done" push (skip / restart).
  const clearScheduledPush = useCallback(() => {
    const id = pushIdRef.current;
    pushIdRef.current = null;
    try {
      localStorage.removeItem(PUSH_KEY);
    } catch {
      /* ignore */
    }
    if (id) cancelMut({ id }).catch(() => {});
  }, [cancelMut]);

  // Schedule a server push for when this rest ends (so it fires even if the
  // app is backgrounded / the phone is locked). Replaces any pending one.
  const scheduleDonePush = useCallback(
    async (sec: number) => {
      const prev = pushIdRef.current;
      pushIdRef.current = null;
      try {
        localStorage.removeItem(PUSH_KEY);
      } catch {
        /* ignore */
      }
      if (prev) cancelMut({ id: prev }).catch(() => {});
      if (sec <= 0) return;
      try {
        const id = await scheduleMut({ seconds: sec });
        if (id) {
          pushIdRef.current = id;
          try {
            localStorage.setItem(PUSH_KEY, id);
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* best-effort */
      }
    },
    [cancelMut, scheduleMut],
  );

  // Restore a still-running timer (and its pending push) after a reload.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const t = Number(raw);
        if (Number.isFinite(t) && t > Date.now()) setEndsAt(t);
        else localStorage.removeItem(STORAGE_KEY);
      }
      const pid = localStorage.getItem(PUSH_KEY);
      if (pid) pushIdRef.current = pid;
    } catch {
      /* ignore */
    }
  }, []);

  // Persist the target time and tick while it runs.
  useEffect(() => {
    if (endsAt === null) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, String(endsAt));
    } catch {
      /* ignore */
    }
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [endsAt]);

  const remaining =
    endsAt !== null ? Math.max(0, Math.round((endsAt - now) / 1000)) : null;

  // Alert + clear when it reaches zero.
  useEffect(() => {
    if (endsAt === null) {
      firedRef.current = false;
      return;
    }
    if (remaining === 0 && !firedRef.current) {
      firedRef.current = true;
      beep();
      try {
        navigator.vibrate?.(DONE_VIBRATION);
      } catch {
        /* vibration unsupported */
      }
      // Drop the local handle but let the scheduled push fire — don't cancel.
      pushIdRef.current = null;
      try {
        localStorage.removeItem(PUSH_KEY);
      } catch {
        /* ignore */
      }
      setEndsAt(null);
    }
  }, [remaining, endsAt]);

  const start = useCallback(
    (sec: number) => {
      firedRef.current = false;
      setEndsAt(Date.now() + sec * 1000);
      scheduleDonePush(sec);
    },
    [scheduleDonePush],
  );
  const adjust = useCallback(
    (delta: number) => {
      const base = endsAtRef.current ?? Date.now();
      const next = Math.max(Date.now() + 1000, base + delta * 1000);
      setEndsAt(next);
      scheduleDonePush(Math.round((next - Date.now()) / 1000));
    },
    [scheduleDonePush],
  );
  const stop = useCallback(() => {
    setEndsAt(null);
    clearScheduledPush();
  }, [clearScheduledPush]);

  return (
    <RestContext.Provider value={{ remaining, start, adjust, stop }}>
      {children}
      {remaining !== null && (
        <div className="fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-50 px-4 md:bottom-4 md:left-64">
          <div className="mx-auto flex max-w-md items-center justify-between gap-3 rounded-full border border-border bg-card px-4 py-2.5 shadow-xl">
            <div className="flex items-center gap-2">
              <Timer weight="bold" className="size-5 text-accent-strong" />
              <span className="font-mono text-lg tabular-nums">
                {fmtClock(remaining)}
              </span>
              <span className="text-sm text-muted-foreground">rest</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => adjust(-15)}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
              >
                −15
              </button>
              <button
                onClick={() => adjust(15)}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
              >
                +15
              </button>
              <button
                onClick={stop}
                className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-strong"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </RestContext.Provider>
  );
}
