"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, useClerk, SignOutButton } from "@clerk/nextjs";
import { useMutation, useQuery, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  SignOut,
  TrashSimple,
  WarningCircle,
  Minus,
  Plus,
  DownloadSimple,
  CaretLeft,
} from "@phosphor-icons/react";
import { PushToggle } from "@/components/push-toggle";
import { Button } from "@/components/ui/button";

// Shared style constants so the whole page is easy to re-theme in one place.
const cardStyles =
  "flex flex-col gap-4 rounded-[16px] border border-border bg-card p-5";
const cardTitleStyles = "font-display text-base font-extrabold";
const rowStyles = "flex items-center justify-between gap-4";
const rowLabelStyles = "text-sm font-semibold";
const rowDescStyles = "mt-0.5 text-xs leading-snug text-muted-foreground";
const steelButtonStyles =
  "inline-flex items-center gap-2 rounded-[10px] border border-border-strong px-4 py-3 font-mono text-xs uppercase tracking-[0.08em] text-bright transition-colors hover:border-accent/40 disabled:opacity-50";

function toCsv(rows: (string | number)[][]) {
  return rows
    .map((r) =>
      r
        .map((cell) => {
          const s = String(cell ?? "");
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");
}

function downloadCsv(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function fmtRest(sec: number) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}:${String(s).padStart(2, "0")}` : `${m} min`;
}

function fmtHour(h: number) {
  const am = h < 12;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${am ? "AM" : "PM"}`;
}

// Rounded pill of mutually exclusive options (LB/KG, text size).
type SegmentOption<T extends string> = { key: T; label: string };
function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="inline-flex gap-1 rounded-full border border-border bg-surface-3 p-1">
      {options.map((option) => {
        const isActive = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={`rounded-full px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.04em] transition-colors ${
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={`flex h-[26px] w-[46px] shrink-0 items-center rounded-full p-[3px] transition-colors ${
        on ? "justify-end bg-accent" : "justify-start bg-muted"
      }`}
    >
      <span
        className={`size-5 rounded-full transition-colors ${
          on ? "bg-accent-foreground" : "bg-dim"
        }`}
      />
    </button>
  );
}

function ReminderRow({
  title,
  desc,
  on,
  onToggle,
}: {
  title: string;
  desc: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={rowStyles}>
      <div className="min-w-0">
        <p className={rowLabelStyles}>{title}</p>
        <p className={rowDescStyles}>{desc}</p>
      </div>
      <Switch on={on} onClick={onToggle} />
    </div>
  );
}

function Stepper({
  value,
  onDec,
  onInc,
}: {
  value: string;
  onDec: () => void;
  onInc: () => void;
}) {
  const stepButtonStyles =
    "flex size-[30px] items-center justify-center rounded-full bg-muted text-bright transition-colors hover:text-foreground";
  return (
    <div className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-border-strong p-1">
      <button onClick={onDec} aria-label="Decrease" className={stepButtonStyles}>
        <Minus weight="bold" className="size-3.5" />
      </button>
      <span className="min-w-[58px] text-center font-display text-[15px] font-extrabold tabular-nums">
        {value}
      </span>
      <button onClick={onInc} aria-label="Increase" className={stepButtonStyles}>
        <Plus weight="bold" className="size-3.5" />
      </button>
    </div>
  );
}

type FontSize = "sm" | "base" | "lg";
const FONT_SIZES: { key: FontSize; label: string; px: string }[] = [
  { key: "sm", label: "Small", px: "14px" },
  { key: "base", label: "Regular", px: "16px" },
  { key: "lg", label: "Large", px: "18px" },
];

const UNIT_OPTIONS: SegmentOption<"lb" | "kg">[] = [
  { key: "lb", label: "LB" },
  { key: "kg", label: "KG" },
];

export default function SettingsPage() {
  const router = useRouter();
  const me = useQuery(api.users.me, {});
  const setUnits = useMutation(api.users.setUnits);
  const setPrefs = useMutation(api.users.setPreferences);
  const deleteData = useMutation(api.users.deleteAccount);
  const convex = useConvex();
  const { user } = useUser();
  const { signOut } = useClerk();

  const [exporting, setExporting] = useState<"workouts" | "body" | null>(null);

  // Training prefs — seeded from the server, updated optimistically.
  const [goal, setGoal] = useState(4);
  const [rest, setRest] = useState(90);
  const [rem, setRem] = useState({
    remindExercise: true,
    remindWeighIn: true,
    remindRest: true,
  });
  const [reminderHour, setReminderHour] = useState(18);
  useEffect(() => {
    if (me?.reminderHour !== undefined) setReminderHour(me.reminderHour);
  }, [me?.reminderHour]);
  function changeReminderHour(h: number) {
    const v = ((h % 24) + 24) % 24;
    setReminderHour(v);
    setPrefs({ reminderHour: v });
  }
  useEffect(() => {
    if (!me) return;
    setRem({
      remindExercise: me.remindExercise !== false,
      remindWeighIn: me.remindWeighIn !== false,
      remindRest: me.remindRest !== false,
    });
  }, [me]);
  function toggleReminder(key: keyof typeof rem) {
    const v = !rem[key];
    setRem((r) => ({ ...r, [key]: v }));
    setPrefs({ [key]: v });
  }
  useEffect(() => {
    if (me?.weeklyGoal) setGoal(me.weeklyGoal);
  }, [me?.weeklyGoal]);
  useEffect(() => {
    if (me?.restSeconds) setRest(me.restSeconds);
  }, [me?.restSeconds]);
  function changeGoal(n: number) {
    const v = Math.min(14, Math.max(1, n));
    setGoal(v);
    setPrefs({ weeklyGoal: v });
  }
  function changeRest(n: number) {
    const v = Math.min(600, Math.max(15, n));
    setRest(v);
    setPrefs({ restSeconds: v });
  }

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [fontSize, setFontSize] = useState<FontSize>("base");
  useEffect(() => {
    try {
      const s = localStorage.getItem("liftify:font-size");
      if (s === "sm" || s === "base" || s === "lg") setFontSize(s);
    } catch {
      /* ignore */
    }
  }, []);
  function applyFontSize(key: FontSize) {
    setFontSize(key);
    const px = FONT_SIZES.find((f) => f.key === key)?.px ?? "16px";
    try {
      localStorage.setItem("liftify:font-size", key);
    } catch {
      /* ignore */
    }
    document.documentElement.style.fontSize = px;
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteData({}); // wipe Convex data while still authenticated
      const res = await fetch("/api/delete-account", { method: "POST" });
      if (!res.ok) throw new Error("Could not delete your account.");
      await signOut({ redirectUrl: "/sign-in" }); // removes Clerk session
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Could not delete account.");
      setDeleting(false);
    }
  }

  const unit = me?.units ?? "lb";

  async function exportWorkouts() {
    setExporting("workouts");
    try {
      const ws = await convex.query(api.workouts.listForUser, { limit: 5000 });
      const rows: (string | number)[][] = [
        ["date", "workout", "exercise", "set", "reps", "weight", "unit"],
      ];
      for (const w of ws) {
        const date = new Date(w.date).toISOString().slice(0, 10);
        for (const ex of w.exercises) {
          ex.sets.forEach((s, i) =>
            rows.push([date, w.name, ex.name, i + 1, s.reps, s.weight, unit]),
          );
        }
      }
      downloadCsv("liftify-workouts.csv", toCsv(rows));
    } finally {
      setExporting(null);
    }
  }

  async function exportBody() {
    setExporting("body");
    try {
      const es = await convex.query(api.bodyEntries.listForUser, {
        limit: 5000,
      });
      const rows: (string | number)[][] = [
        ["date", "weight", "unit", "waist", "chest", "arms", "hips", "thighs", "notes"],
      ];
      for (const e of es) {
        const m = e.measurements ?? {};
        rows.push([
          new Date(e.date).toISOString().slice(0, 10),
          e.weight,
          unit,
          m.waist ?? "",
          m.chest ?? "",
          m.arms ?? "",
          m.hips ?? "",
          m.thighs ?? "",
          e.notes ?? "",
        ]);
      }
      downloadCsv("liftify-body.csv", toCsv(rows));
    } finally {
      setExporting(null);
    }
  }

  const name =
    [me?.firstName, me?.lastName].filter(Boolean).join(" ") ||
    user?.fullName ||
    "—";
  const email = me?.email || user?.primaryEmailAddress?.emailAddress || "—";

  return (
    <div className="container-page flex max-w-2xl flex-col gap-4 py-8">
      {/* Mobile header — big title with a back caret. */}
      <div className="flex items-center gap-2.5 sm:hidden">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <CaretLeft weight="bold" className="size-5" />
        </button>
        <h1 className="font-display text-3xl font-black">SETTINGS</h1>
      </div>

      {/* Desktop header — mono eyebrow + big title. */}
      <div className="hidden sm:block">
        <p className="mono-label text-[11px] text-muted-foreground">PREFERENCES</p>
        <h1 className="font-display text-4xl font-black leading-none">SETTINGS</h1>
      </div>

      {/* Units */}
      <section className={cardStyles}>
        <h3 className={cardTitleStyles}>Units</h3>
        <div className={rowStyles}>
          <div className="min-w-0">
            <p className={rowLabelStyles}>Weight unit</p>
            <p className={rowDescStyles}>Across workouts &amp; body journal.</p>
          </div>
          <Segmented
            options={UNIT_OPTIONS}
            value={unit}
            onChange={(u) => {
              if (u !== unit) setUnits({ units: u });
            }}
          />
        </div>
      </section>

      {/* Text size */}
      <section className={cardStyles}>
        <h3 className={cardTitleStyles}>Text size</h3>
        <Segmented options={FONT_SIZES} value={fontSize} onChange={applyFontSize} />
      </section>

      {/* Training */}
      <section className={cardStyles}>
        <h3 className={cardTitleStyles}>Training</h3>
        <div className={rowStyles}>
          <div className="min-w-0">
            <p className={rowLabelStyles}>Weekly goal</p>
            <p className={rowDescStyles}>Target workouts per week.</p>
          </div>
          <Stepper
            value={`${goal}`}
            onDec={() => changeGoal(goal - 1)}
            onInc={() => changeGoal(goal + 1)}
          />
        </div>
        <div className={rowStyles}>
          <div className="min-w-0">
            <p className={rowLabelStyles}>Default rest timer</p>
            <p className={rowDescStyles}>
              Starts automatically when you finish a set.
            </p>
          </div>
          <Stepper
            value={fmtRest(rest)}
            onDec={() => changeRest(rest - 15)}
            onInc={() => changeRest(rest + 15)}
          />
        </div>
      </section>

      {/* Reminders */}
      <section className={cardStyles}>
        <h3 className={cardTitleStyles}>Reminders</h3>
        <div className={rowStyles}>
          <div className="min-w-0">
            <p className={rowLabelStyles}>Reminder time</p>
            <p className={rowDescStyles}>Daily &amp; weekly, your local time.</p>
          </div>
          <Stepper
            value={fmtHour(reminderHour)}
            onDec={() => changeReminderHour(reminderHour - 1)}
            onInc={() => changeReminderHour(reminderHour + 1)}
          />
        </div>
        <ReminderRow
          title="Daily exercise"
          desc="A nudge to train if you've been inactive today."
          on={rem.remindExercise}
          onToggle={() => toggleReminder("remindExercise")}
        />
        <ReminderRow
          title="Weekly weigh-in"
          desc="A Monday reminder to log your body weight."
          on={rem.remindWeighIn}
          onToggle={() => toggleReminder("remindWeighIn")}
        />
        <ReminderRow
          title="Rest timer done"
          desc="Push when your rest timer reaches zero."
          on={rem.remindRest}
          onToggle={() => toggleReminder("remindRest")}
        />
      </section>

      {/* Push reminders (device-level opt-in) */}
      <PushToggle />

      {/* Export data */}
      <section className={cardStyles}>
        <h3 className={cardTitleStyles}>Export your data</h3>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={exportWorkouts}
            disabled={exporting !== null}
            className={steelButtonStyles}
          >
            <DownloadSimple weight="bold" className="size-4" />
            {exporting === "workouts" ? "Exporting…" : "Workouts CSV"}
          </button>
          <button
            onClick={exportBody}
            disabled={exporting !== null}
            className={steelButtonStyles}
          >
            <DownloadSimple weight="bold" className="size-4" />
            {exporting === "body" ? "Exporting…" : "Body log CSV"}
          </button>
        </div>
      </section>

      {/* Account */}
      <section className={cardStyles}>
        <h3 className={cardTitleStyles}>Account</h3>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="truncate font-semibold">{name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="truncate font-semibold">{email}</dd>
          </div>
        </dl>
        <SignOutButton redirectUrl="/sign-in">
          <button
            className={`${steelButtonStyles} self-start`}
          >
            <SignOut weight="bold" className="size-4" />
            Sign out
          </button>
        </SignOutButton>
      </section>

      {/* Danger zone */}
      <section className="flex flex-col gap-3 rounded-[16px] border border-red-500/30 bg-card p-5">
        <h3 className={`${cardTitleStyles} text-red-500`}>Danger zone</h3>
        <p className="text-xs leading-snug text-muted-foreground">
          Permanently delete your account and all data. This cannot be undone.
        </p>
        <button
          onClick={() => {
            setDeleteError(null);
            setConfirmDelete(true);
          }}
          className="inline-flex items-center gap-2 self-start rounded-[10px] border border-red-500/40 px-4 py-3 font-mono text-xs uppercase tracking-[0.08em] text-red-500 transition-colors hover:bg-red-500/10"
        >
          <TrashSimple weight="bold" className="size-4" />
          Delete account
        </button>
      </section>

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={() => !deleting && setConfirmDelete(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-[16px] border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-red-500">
              <WarningCircle weight="fill" className="size-5" />
              <h2 className="font-display text-lg font-extrabold">
                Delete account?
              </h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              This permanently deletes your Liftify login and every workout and
              body entry you&apos;ve logged. This cannot be undone.
            </p>
            {deleteError && (
              <p className="mt-3 text-sm text-red-500">{deleteError}</p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete account"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
