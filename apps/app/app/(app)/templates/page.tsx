"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Plus, TrashSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { TemplateCard } from "@/components/templates/template-card";

// Keep this in sync with the cap enforced in convex/templates.ts.
const MAX_TEMPLATES = 5;

export default function TemplatesPage() {
  const templates = useQuery(api.templates.list, {});
  const removeTemplate = useMutation(api.templates.remove);

  // The template queued for deletion (drives the confirm modal).
  const [pendingDelete, setPendingDelete] = useState<{
    id: Id<"templates">;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const templateCount = templates?.length ?? 0;
  const atLimit = templateCount >= MAX_TEMPLATES;

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await removeTemplate({ templateId: pendingDelete.id });
      setPendingDelete(null);
    } catch {
      /* leave the modal open on failure */
    }
    setDeleting(false);
  }

  return (
    <div className="container-page flex max-w-2xl flex-col gap-5 py-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="mono-label text-[11px] text-muted-foreground">
            QUICK-START DAYS
          </p>
          <h1 className="font-display text-3xl font-black md:text-4xl">
            TEMPLATES
          </h1>
        </div>
        {templates !== undefined && (
          <span className="mono-label shrink-0 text-[11px] text-muted-foreground">
            {templateCount}/{MAX_TEMPLATES}
          </span>
        )}
      </header>

      {templates === undefined ? (
        <TemplatesSkeleton />
      ) : templates.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-border p-8 text-center">
          <p className="mono-label text-[10px] text-dim">No templates yet</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
            Save your go-to days (Push, Pull, Legs…) to start a workout in one tap.
          </p>
          <Link
            href="/templates/new"
            className="mt-3 inline-flex items-center gap-2 font-display text-lg font-black text-accent"
          >
            <Plus weight="bold" className="size-5" />
            Create your first template
          </Link>
        </div>
      ) : (
        <section className="flex flex-col gap-3">
          {templates.map((template) => (
            <TemplateCard
              key={template._id}
              template={template}
              onDelete={() =>
                setPendingDelete({ id: template._id, name: template.name })
              }
            />
          ))}
        </section>
      )}

      {/* New template — disabled at the cap. */}
      {templates !== undefined && templates.length > 0 && (
        <div className="flex flex-col gap-2">
          {atLimit ? (
            <div className="rounded-[14px] border border-dashed border-border px-4 py-4 text-center">
              <p className="mono-label text-[10px] text-dim">
                TEMPLATE LIMIT REACHED ({MAX_TEMPLATES}/{MAX_TEMPLATES})
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Delete one to make room for a new template.
              </p>
            </div>
          ) : (
            <Link
              href="/templates/new"
              className="flex w-full items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-border-strong px-4 py-4 text-accent transition-colors hover:border-accent hover:bg-accent/5"
            >
              <Plus weight="bold" className="size-4" />
              <span className="mono-label text-xs">NEW TEMPLATE</span>
            </Link>
          )}
        </div>
      )}

      {/* Delete confirmation */}
      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={() => !deleting && setPendingDelete(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-[16px] border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-red-500">
              <TrashSimple weight="fill" className="size-5" />
              <h2 className="font-display text-lg font-extrabold">
                Delete template?
              </h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              &ldquo;{pendingDelete.name}&rdquo; will be removed. Your logged
              workouts are not affected.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setPendingDelete(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplatesSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-32 animate-pulse rounded-[16px] border border-border bg-card"
        />
      ))}
    </div>
  );
}
