"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Plus,
  CaretDown,
  Trash,
  Check,
  X,
  TrendDown,
  TrendUp,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Field, Input } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { shortDate } from "@/lib/date";

const MEAS_KEYS = ["waist", "chest", "arms", "hips", "thighs"] as const;
type MeasKey = (typeof MEAS_KEYS)[number];

// Volt accent used for the recharts line + area fill (recharts needs literal hex).
const VOLT = "#d7f24a";

// Shared style constants so the user can tweak the look in one place.
const sectionLabel = "mb-2 mono-label text-label text-muted-foreground";
// History rows are buttons/list items (not the Card div), so keep a shape-locked
// class string here rather than the Card primitive.
const historyRow =
  "flex w-full items-center justify-between gap-3 rounded-card border border-border " +
  "bg-card px-4 py-3 text-left transition-colors hover:border-border-strong";

function measLabel(key: MeasKey) {
  return key.toUpperCase();
}

export default function BodyPage() {
  const me = useQuery(api.users.me, {});
  const entries = useQuery(api.bodyEntries.listForUser, { limit: 365 });
  const create = useMutation(api.bodyEntries.create);
  const update = useMutation(api.bodyEntries.update);
  const removeEntry = useMutation(api.bodyEntries.remove);
  const unit = me?.units ?? "lb";

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editMeas, setEditMeas] = useState<Record<MeasKey, string>>({
    waist: "",
    chest: "",
    arms: "",
    hips: "",
    thighs: "",
  });
  const [editError, setEditError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [showMeas, setShowMeas] = useState(false);
  const [meas, setMeas] = useState<Record<MeasKey, string>>({
    waist: "",
    chest: "",
    arms: "",
    hips: "",
    thighs: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ascending = entries ? [...entries].reverse() : [];
  const chartData = ascending.map((entry) => ({
    label: shortDate(entry.date),
    weight: entry.weight,
  }));
  const latest = entries?.[0];
  const previous = entries?.[1];
  const weightDelta =
    latest && previous
      ? Math.round((latest.weight - previous.weight) * 10) / 10
      : null;
  const latestMeas = entries?.find(
    (entry) =>
      entry.measurements &&
      Object.values(entry.measurements).some((value) => value != null),
  )?.measurements;
  const shownMeasKeys = latestMeas
    ? MEAS_KEYS.filter((key) => latestMeas[key] != null)
    : [];

  async function add() {
    setError(null);
    const parsedWeight = Number(weight);
    if (!(parsedWeight > 0)) {
      setError("Enter a valid weight.");
      return;
    }
    setSaving(true);
    try {
      const measurements: Partial<Record<MeasKey, number>> = {};
      for (const key of MEAS_KEYS) {
        const value = Number(meas[key]);
        if (meas[key] && value > 0) measurements[key] = value;
      }
      await create({
        weight: parsedWeight,
        notes: notes.trim() || undefined,
        measurements: Object.keys(measurements).length
          ? measurements
          : undefined,
      });
      setWeight("");
      setNotes("");
      setMeas({ waist: "", chest: "", arms: "", hips: "", thighs: "" });
      setOpen(false);
      setShowMeas(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save entry.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(entry: {
    _id: Id<"bodyEntries">;
    weight: number;
    notes?: string;
    measurements?: Partial<Record<MeasKey, number>>;
  }) {
    setEditingId(entry._id);
    setEditWeight(String(entry.weight));
    setEditNotes(entry.notes ?? "");
    const m = entry.measurements ?? {};
    setEditMeas({
      waist: m.waist != null ? String(m.waist) : "",
      chest: m.chest != null ? String(m.chest) : "",
      arms: m.arms != null ? String(m.arms) : "",
      hips: m.hips != null ? String(m.hips) : "",
      thighs: m.thighs != null ? String(m.thighs) : "",
    });
    setEditError(null);
  }

  async function saveEdit(entryId: Id<"bodyEntries">) {
    setEditError(null);
    const parsedWeight = Number(editWeight);
    if (!(parsedWeight > 0)) {
      setEditError("Enter a valid weight.");
      return;
    }
    try {
      const measurements: Partial<Record<MeasKey, number>> = {};
      for (const key of MEAS_KEYS) {
        const value = Number(editMeas[key]);
        if (editMeas[key] && value > 0) measurements[key] = value;
      }
      await update({
        entryId,
        weight: parsedWeight,
        notes: editNotes,
        measurements,
      });
      setEditingId(null);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Could not save.");
    }
  }

  const hasEntries = entries && entries.length > 0;
  const hasTrend = chartData.length >= 2;

  // Header add/close toggle — a pill button that reveals the add-entry form.
  const toggleButton = (
    <button
      type="button"
      onClick={() => setOpen((value) => !value)}
      className={
        open
          ? "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-4 py-2 font-mono text-label-lg font-semibold uppercase tracking-[0.06em] text-foreground transition-colors hover:bg-card"
          : "inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 font-mono text-label-lg font-semibold uppercase tracking-[0.06em] text-accent-foreground transition hover:brightness-105"
      }
    >
      {open ? (
        <>
          <X weight="bold" className="size-3.5" />
          Close
        </>
      ) : (
        <>
          <Plus weight="bold" className="size-3.5" />
          Add entry
        </>
      )}
    </button>
  );

  // The current-weight card is reused inside two different desktop layouts,
  // so define it once here.
  const weightCard = (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="mono-label text-label text-muted-foreground">
            Current weight
          </p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-4xl font-black leading-none tabular-nums sm:text-5xl">
              {latest ? latest.weight : "—"}
            </span>
            <span className="font-mono text-sm text-muted-foreground">
              {unit}
            </span>
          </p>
        </div>
        {weightDelta !== null && weightDelta !== 0 && (
          <Badge tone={weightDelta > 0 ? "accent" : "neutral"}>
            {weightDelta < 0 ? (
              <TrendDown weight="bold" className="size-3" />
            ) : (
              <TrendUp weight="bold" className="size-3" />
            )}
            {Math.abs(weightDelta)} {unit}
          </Badge>
        )}
      </div>

      {hasTrend ? (
        <div className="mt-4 h-44 sm:h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
            >
              <defs>
                <linearGradient id="voltArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={VOLT} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={VOLT} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={["dataMin - 1", "dataMax + 1"]}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  fontSize: 13,
                }}
              />
              <Area
                type="monotone"
                dataKey="weight"
                stroke={VOLT}
                strokeWidth={2.5}
                fill="url(#voltArea)"
                dot={{ r: 3, fill: VOLT }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Log at least two entries to see your trend.
        </p>
      )}

      <p className="mt-2 text-center mono-label text-label text-muted-foreground">
        12-week trend
      </p>
    </Card>
  );

  const measurementsBlock = shownMeasKeys.length > 0 && (
    <section>
      <p className={sectionLabel}>Latest measurements</p>
      <div className="grid grid-cols-3 gap-2 lg:grid-cols-2">
        {shownMeasKeys.map((key) => (
          <Card key={key} className="px-3 py-3">
            <p className="mono-label text-label text-muted-foreground">
              {measLabel(key)}
            </p>
            <p className="mt-1 flex items-baseline gap-1">
              <span className="font-display text-2xl font-black leading-none tabular-nums">
                {latestMeas?.[key]}
              </span>
              <span className="font-mono text-label text-muted-foreground">
                in
              </span>
            </p>
          </Card>
        ))}
      </div>
    </section>
  );

  return (
    <div className="container-page flex flex-col gap-6 py-8">
      {/* Header */}
      <PageHeader
        eyebrow="Weight & measurements"
        title="Body"
        action={toggleButton}
      />

      {/* Add entry form */}
      {open && (
        <Card className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <Field
              label={`Weight (${unit})`}
              error={error ?? undefined}
              className="flex-1"
            >
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                autoFocus
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </Field>
            <Field label="Notes (optional)" className="flex-2">
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </div>

          <button
            type="button"
            onClick={() => setShowMeas((value) => !value)}
            className="mt-4 flex items-center gap-1 mono-label text-label text-muted-foreground transition-colors hover:text-foreground"
          >
            <CaretDown
              className={`size-4 transition-transform ${showMeas ? "rotate-180" : ""}`}
            />
            Measurements — inches (optional)
          </button>
          {showMeas && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {MEAS_KEYS.map((key) => (
                <Field key={key} label={measLabel(key)}>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="0"
                    value={meas[key]}
                    onChange={(e) =>
                      setMeas((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                  />
                </Field>
              ))}
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <Button onClick={add} disabled={saving}>
              {saving ? "Saving…" : "Save entry"}
            </Button>
          </div>
        </Card>
      )}

      {entries === undefined ? (
        <BodySkeleton />
      ) : !hasEntries ? (
        <EmptyState
          title="No entries yet"
          description="Add your first weigh-in to start tracking progress."
        />
      ) : (
        <>
          {/* Weight card + latest measurements */}
          {shownMeasKeys.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
              {weightCard}
              {measurementsBlock}
            </div>
          ) : (
            weightCard
          )}

          {/* History */}
          <section>
            <p className={sectionLabel}>History</p>
            <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              {entries.slice(0, 60).map((entry) =>
                editingId === entry._id ? (
                  <li key={entry._id} className="lg:col-span-2">
                    <Card className="p-4">
                      <div className="flex justify-end">
                        <IconButton
                          aria-label="Cancel"
                          onClick={() => setEditingId(null)}
                          className="-mr-1 -mt-1"
                        >
                          <X className="size-4" />
                        </IconButton>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                        <Field
                          label={`Weight (${unit})`}
                          error={editError ?? undefined}
                          className="flex-1"
                        >
                          <Input
                            type="number"
                            inputMode="decimal"
                            step="0.1"
                            min="0"
                            autoFocus
                            value={editWeight}
                            onChange={(ev) => setEditWeight(ev.target.value)}
                          />
                        </Field>
                        <Field label="Notes" className="flex-2">
                          <Input
                            value={editNotes}
                            onChange={(ev) => setEditNotes(ev.target.value)}
                          />
                        </Field>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                        {MEAS_KEYS.map((key) => (
                          <Field key={key} label={`${measLabel(key)} (in)`}>
                            <Input
                              type="number"
                              inputMode="decimal"
                              step="0.1"
                              min="0"
                              value={editMeas[key]}
                              onChange={(ev) =>
                                setEditMeas((m) => ({
                                  ...m,
                                  [key]: ev.target.value,
                                }))
                              }
                            />
                          </Field>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <IconButton
                          variant="danger"
                          aria-label="Delete entry"
                          onClick={() => {
                            removeEntry({ entryId: entry._id });
                            setEditingId(null);
                          }}
                        >
                          <Trash className="size-4" />
                        </IconButton>
                        <Button
                          size="sm"
                          aria-label="Save"
                          onClick={() => saveEdit(entry._id)}
                        >
                          <Check weight="bold" className="size-4" />
                        </Button>
                      </div>
                    </Card>
                  </li>
                ) : (
                  <li key={entry._id}>
                    <button
                      type="button"
                      onClick={() => startEdit(entry)}
                      aria-label="Edit entry"
                      className={historyRow}
                    >
                      <span className="min-w-0">
                        <span className="font-display text-base font-extrabold tabular-nums">
                          {entry.weight}{" "}
                          <span className="font-mono text-label-lg font-normal text-muted-foreground">
                            {unit}
                          </span>
                        </span>
                        {entry.notes && (
                          <span className="block truncate font-mono text-label text-dim">
                            {entry.notes}
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-label-lg text-bright">
                        {shortDate(entry.date)}
                      </span>
                    </button>
                  </li>
                ),
              )}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function BodySkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-6">
      <div className="rounded-card border border-border-strong bg-card p-5">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="mt-4 h-44 rounded-field bg-muted" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-3 w-40 rounded bg-muted" />
        <div className="grid grid-cols-3 gap-2 lg:grid-cols-5">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-16 rounded-card border border-border bg-muted"
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-3 w-20 rounded bg-muted" />
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-14 rounded-card border border-border bg-muted"
          />
        ))}
      </div>
    </div>
  );
}
