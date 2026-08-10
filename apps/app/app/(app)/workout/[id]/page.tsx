"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ArrowsClockwise,
  Barbell,
  CaretLeft,
  Cards,
  ChartBar,
  PencilSimple,
  Stack,
  TrashSimple,
} from "@phosphor-icons/react";
import { Button, buttonClass } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/field";

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDuration(sec: number) {
  const totalMinutes = Math.round(sec / 60);
  if (totalMinutes < 1) return "<1 min";
  if (totalMinutes < 60) return `${totalMinutes} min`;
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
}

// The edit action is a Link, so it can't be an IconButton (a <button>). Mirror
// the ghost IconButton at the 44px tap-target size for a consistent shape.
const editLinkStyles =
  "flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

export default function WorkoutDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const me = useQuery(api.users.me, {});
  const workout = useQuery(api.workouts.getById, {
    workoutId: id as Id<"workouts">,
  });
  const remove = useMutation(api.workouts.remove);
  const createTemplate = useMutation(api.templates.create);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // "Save as template" modal state.
  const [saveOpen, setSaveOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  const unit = me?.units ?? "lb";

  function openSaveAsTemplate() {
    if (!workout) return;
    setTemplateName(workout.name);
    setTemplateError(null);
    setSaveOpen(true);
  }
  async function handleSaveAsTemplate() {
    if (!workout) return;
    setTemplateError(null);
    setSavingTemplate(true);
    try {
      await createTemplate({
        name: templateName,
        exercises: workout.exercises,
      });
      setSaveOpen(false);
      router.push("/templates");
    } catch (e) {
      setTemplateError(
        e instanceof Error ? e.message : "Could not save template.",
      );
      setSavingTemplate(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await remove({ workoutId: id as Id<"workouts"> });
      router.push("/history");
    } catch {
      setDeleting(false);
    }
  }

  if (workout === undefined) {
    return (
      <div className="container-page py-8">
        <div className="h-40 animate-pulse rounded-card border border-border bg-card" />
      </div>
    );
  }
  if (workout === null) {
    return (
      <div className="container-page py-16 text-center">
        <p className="mono-label text-label text-dim">Not found</p>
        <p className="mt-2 text-muted-foreground">
          This workout no longer exists.
        </p>
        <Link
          href="/history"
          className="mt-3 inline-block font-display text-lg font-black text-accent"
        >
          Back to history
        </Link>
      </div>
    );
  }

  const totalSets = workout.exercises.reduce(
    (count, exercise) => count + exercise.sets.length,
    0,
  );
  const totalVolume = Math.round(
    workout.exercises.reduce(
      (sum, exercise) =>
        sum +
        exercise.sets.reduce(
          (setSum, set) => setSum + set.reps * set.weight,
          0,
        ),
      0,
    ),
  );

  const dateLine =
    formatDate(workout.date) +
    (workout.durationSec ? ` · ${formatDuration(workout.durationSec)}` : "");

  return (
    <div className="container-page flex flex-col gap-6 py-8">
      <Link
        href="/history"
        className="mono-label inline-flex items-center gap-1.5 text-label-lg text-muted-foreground transition-colors hover:text-foreground"
      >
        <CaretLeft weight="bold" className="size-3.5" />
        History
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-black md:text-4xl">
            {workout.name}
          </h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {dateLine}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/workout/new?edit=${workout._id}`}
            aria-label="Edit workout"
            title="Edit workout"
            className={editLinkStyles}
          >
            <PencilSimple weight="bold" className="size-5" />
          </Link>
          <IconButton
            variant="danger"
            onClick={() => setConfirmDelete(true)}
            aria-label="Delete workout"
          >
            <TrashSimple weight="bold" className="size-5" />
          </IconButton>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          href={`/workout/new?repeat=${workout._id}`}
          className={buttonClass("display", "lg", "flex-1")}
        >
          <ArrowsClockwise weight="bold" className="size-5" />
          REPEAT THIS WORKOUT
        </Link>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={openSaveAsTemplate}
          className="font-display !font-black italic tracking-tight"
        >
          <Cards weight="bold" className="size-5" />
          SAVE AS TEMPLATE
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Exercises"
          value={workout.exercises.length}
          icon={<Barbell weight="bold" className="size-3" />}
        />
        <StatCard
          label="Sets"
          value={totalSets}
          icon={<Stack weight="bold" className="size-3" />}
        />
        <StatCard
          label="Volume"
          value={totalVolume}
          unit={unit}
          icon={<ChartBar weight="bold" className="size-3" />}
        />
      </div>

      <div className="flex flex-col gap-3">
        {workout.exercises.map((exercise, exerciseIndex) => (
          <Card key={exerciseIndex} className="p-4">
            <p className="font-display text-base font-extrabold">
              {exercise.name}
            </p>
            <ul className="mt-3 flex flex-col gap-1.5">
              {exercise.sets.map((set, setIndex) => (
                <li
                  key={setIndex}
                  className="flex items-center justify-between border-t border-border pt-1.5 first:border-t-0 first:pt-0"
                >
                  <span className="mono-label text-label text-dim">
                    Set {setIndex + 1}
                  </span>
                  <span className="font-mono text-sm tabular-nums text-bright">
                    {set.reps} × {set.weight} {unit}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => !deleting && setConfirmDelete(false)}
        title="Delete workout?"
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
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          &ldquo;{workout.name}&rdquo; will be permanently removed from your
          history.
        </p>
      </Modal>

      {/* Save as template */}
      <Modal
        open={saveOpen}
        onClose={() => !savingTemplate && setSaveOpen(false)}
        title="Save as template"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setSaveOpen(false)}
              disabled={savingTemplate}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAsTemplate}
              disabled={savingTemplate || templateName.trim().length === 0}
            >
              {savingTemplate ? "Saving…" : "Save template"}
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          Reuse these {workout.exercises.length} exercise
          {workout.exercises.length === 1 ? "" : "s"} to start a workout fast.
        </p>
        <Input
          value={templateName}
          onChange={(event) => setTemplateName(event.target.value)}
          aria-label="Template name"
          placeholder="Template name"
          className="mt-4"
        />
        {templateError && (
          <p className="mt-3 text-sm text-danger">{templateError}</p>
        )}
      </Modal>
    </div>
  );
}
