"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, useClerk, SignOutButton } from "@clerk/nextjs";
import { useMutation, useQuery, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  SignOut,
  TrashSimple,
  WarningCircle,
  DownloadSimple,
  CaretLeft,
  CaretRight,
  ShieldCheck,
  Check,
} from "@phosphor-icons/react";
import { PushToggle } from "@/components/push-toggle";
import { InstallPrompt } from "@/components/install-prompt";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import {
  Segmented,
  Stepper,
  Switch,
  type SegmentOption,
} from "@/components/ui/form-controls";
import { EQUIPMENT_OPTIONS } from "@/lib/presets";

// Shared style constants so the whole page is easy to re-theme in one place.
// The card surface (radius + border + background) now comes from <Card>; these
// only cover the inner layout so every section stays visually consistent.
const cardBodyStyles = "flex flex-col gap-4 p-5";
const cardTitleStyles = "font-display text-base font-extrabold";
const rowStyles = "flex items-center justify-between gap-4";
const rowLabelStyles = "text-sm font-semibold";
const rowDescStyles = "mt-0.5 text-xs leading-snug text-muted-foreground";

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

type FitnessGoal =
  | "build-muscle"
  | "cardio"
  | "home-workout"
  | "recovery"
  | "general";
const GOAL_OPTIONS: { key: FitnessGoal; label: string }[] = [
  { key: "build-muscle", label: "Build muscle" },
  { key: "cardio", label: "Cardio" },
  { key: "home-workout", label: "Home workout" },
  { key: "recovery", label: "Recovery" },
  { key: "general", label: "General" },
];

// Lightweight placeholder shown until the user's profile has loaded, so the
// preference controls don't flash their default values first.
function SettingsSkeleton() {
  return (
    <div className="container-page flex max-w-2xl animate-pulse flex-col gap-4 py-8">
      <div className="h-9 w-40 rounded-lg bg-muted" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-32 rounded-card border border-border bg-card" />
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const me = useQuery(api.users.me, {});
  const setUnits = useMutation(api.users.setUnits);
  const setPrefs = useMutation(api.users.setPreferences);
  const saveEquipment = useMutation(api.users.setEquipment);
  const deleteData = useMutation(api.users.deleteAccount);
  const convex = useConvex();
  const { user } = useUser();
  const { signOut } = useClerk();
  const isAdmin = useQuery(api.admin.isAdmin);

  const [exporting, setExporting] = useState<"workouts" | "body" | null>(null);

  // Training prefs — seeded from the server, updated optimistically.
  const [goal, setGoal] = useState(4);
  const [rest, setRest] = useState(90);
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal>("general");
  useEffect(() => {
    if (me?.fitnessGoal) setFitnessGoal(me.fitnessGoal);
  }, [me?.fitnessGoal]);
  function changeFitnessGoal(v: FitnessGoal) {
    setFitnessGoal(v);
    setPrefs({ fitnessGoal: v });
  }
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

  // The user's weight room — seeded from the server, saved on each toggle.
  const [equipmentKeys, setEquipmentKeys] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (me?.equipment) setEquipmentKeys(new Set(me.equipment));
  }, [me?.equipment]);
  function toggleEquipment(key: string) {
    setEquipmentKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      saveEquipment({ equipment: [...next] });
      return next;
    });
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

  // Hold the page until the profile row exists so preference controls don't
  // flash their defaults before the saved values arrive.
  if (!me) return <SettingsSkeleton />;

  const name =
    [me.firstName, me.lastName].filter(Boolean).join(" ") ||
    user?.fullName ||
    "—";
  const email = me.email || user?.primaryEmailAddress?.emailAddress || "—";

  return (
    <div className="container-page flex max-w-2xl flex-col gap-4 py-8">
      {/* Header — mono eyebrow + big title, with a mobile-only back caret. */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          className="text-muted-foreground transition-colors hover:text-foreground sm:hidden"
        >
          <CaretLeft weight="bold" className="size-5" />
        </button>
        <PageHeader eyebrow="Preferences" title="Settings" className="flex-1" />
      </div>

      {/* Admin portal — only rendered for admins. The primary entry point on
          mobile (the desktop sidebar also has an Admin link). */}
      {isAdmin && (
        <Link
          href="/admin"
          className="flex items-center gap-3 rounded-card border border-accent/40 bg-accent/[0.06] p-4 transition-colors hover:bg-accent/10"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
            <ShieldCheck weight="fill" className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-extrabold">Admin portal</p>
            <p className="text-xs text-muted-foreground">
              Insights, affiliate links, users &amp; broadcasts.
            </p>
          </div>
          <CaretRight weight="bold" className="size-4 text-muted-foreground" />
        </Link>
      )}

      {/* Units */}
      <Card className={cardBodyStyles}>
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
      </Card>

      {/* Weight room — which equipment the user has, powers starter days. */}
      <Card className={cardBodyStyles}>
        <div>
          <h3 className={cardTitleStyles}>Your weight room</h3>
          <p className={rowDescStyles}>
            What you have to train with. Bodyweight moves are always included.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {EQUIPMENT_OPTIONS.map((option) => {
            const selected = equipmentKeys.has(option.key);
            const base =
              "flex items-center justify-between gap-2 rounded-2xl border px-3.5 py-3 text-left text-sm font-medium transition-colors";
            const state = selected
              ? "border-accent bg-accent/10 text-foreground"
              : "border-border bg-surface-3 text-muted-foreground hover:text-foreground";
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => toggleEquipment(option.key)}
                aria-pressed={selected}
                className={`${base} ${state}`}
              >
                <span className="truncate">{option.label}</span>
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                    selected
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border-strong"
                  }`}
                >
                  {selected && <Check weight="bold" className="size-3" />}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Text size */}
      <Card className={cardBodyStyles}>
        <h3 className={cardTitleStyles}>Text size</h3>
        <Segmented options={FONT_SIZES} value={fontSize} onChange={applyFontSize} />
      </Card>

      {/* Training */}
      <Card className={cardBodyStyles}>
        <h3 className={cardTitleStyles}>Training</h3>
        <div>
          <div className="min-w-0">
            <p className={rowLabelStyles}>Fitness goal</p>
            <p className={rowDescStyles}>We tailor gear &amp; tips to it.</p>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {GOAL_OPTIONS.map((option) => {
              const selected = fitnessGoal === option.key;
              const base =
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors";
              const state = selected
                ? "border-accent bg-accent/10 text-foreground"
                : "border-border bg-surface-3 text-muted-foreground hover:text-foreground";
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => changeFitnessGoal(option.key)}
                  aria-pressed={selected}
                  className={`${base} ${state}`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
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
      </Card>

      {/* Reminders */}
      <Card className={cardBodyStyles}>
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
      </Card>

      {/* Install nudge — reminders only reach a closed app once installed. */}
      <InstallPrompt />

      {/* Push reminders (device-level opt-in) */}
      <PushToggle />

      {/* Export data */}
      <Card className={cardBodyStyles}>
        <h3 className={cardTitleStyles}>Export your data</h3>
        <div className="flex flex-wrap gap-2.5">
          <Button
            variant="secondary"
            onClick={exportWorkouts}
            disabled={exporting !== null}
          >
            <DownloadSimple weight="bold" className="size-4" />
            {exporting === "workouts" ? "Exporting…" : "Workouts CSV"}
          </Button>
          <Button
            variant="secondary"
            onClick={exportBody}
            disabled={exporting !== null}
          >
            <DownloadSimple weight="bold" className="size-4" />
            {exporting === "body" ? "Exporting…" : "Body log CSV"}
          </Button>
        </div>
      </Card>

      {/* Account */}
      <Card className={cardBodyStyles}>
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
          <Button variant="secondary" className="self-start">
            <SignOut weight="bold" className="size-4" />
            Sign out
          </Button>
        </SignOutButton>
      </Card>

      {/* Danger zone */}
      <section className="flex flex-col gap-3 rounded-card border border-danger/30 bg-card p-5">
        <h3 className={`${cardTitleStyles} text-danger`}>Danger zone</h3>
        <p className="text-xs leading-snug text-muted-foreground">
          Permanently delete your account and all data. This cannot be undone.
        </p>
        <Button
          variant="danger-outline"
          className="self-start"
          onClick={() => {
            setDeleteError(null);
            setConfirmDelete(true);
          }}
        >
          <TrashSimple weight="bold" className="size-4" />
          Delete account
        </Button>
      </section>

      <Modal
        open={confirmDelete}
        onClose={() => {
          if (!deleting) setConfirmDelete(false);
        }}
        title="Delete account?"
        footer={
          <div className="flex justify-end gap-2">
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
        }
      >
        <div className="flex items-start gap-2 text-danger">
          <WarningCircle weight="fill" className="size-5 shrink-0" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            This permanently deletes your Liftify login and every workout and
            body entry you&apos;ve logged. This cannot be undone.
          </p>
        </div>
        {deleteError && (
          <p className="mt-3 text-sm text-danger">{deleteError}</p>
        )}
      </Modal>
    </div>
  );
}
