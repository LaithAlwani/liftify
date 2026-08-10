"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Plus, Barbell } from "@phosphor-icons/react";
import { Button, buttonClass } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { TemplateCard } from "@/components/templates/template-card";

// Keep this in sync with the cap enforced in convex/templates.ts.
const MAX_TEMPLATES = 5;

const dashedAddStyles =
  "flex w-full items-center justify-center gap-2 rounded-card border-[1.5px] " +
  "border-dashed border-border-strong px-4 py-4 text-accent transition-colors " +
  "hover:border-accent hover:bg-accent/5";

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
      <PageHeader
        eyebrow="QUICK-START DAYS"
        title="Templates"
        action={
          templates !== undefined && (
            <Badge tone={atLimit ? "danger" : "neutral"} className="shrink-0">
              {templateCount}/{MAX_TEMPLATES}
            </Badge>
          )
        }
      />

      {templates === undefined ? (
        <TemplatesSkeleton />
      ) : templates.length === 0 ? (
        <EmptyState
          icon={<Barbell weight="fill" className="size-5" />}
          title="No templates yet"
          description="Save your go-to days (Push, Pull, Legs…) to start a workout in one tap."
          action={
            <Link href="/templates/new" className={buttonClass("display", "md")}>
              <Plus weight="bold" className="size-4" />
              Create your first template
            </Link>
          }
        />
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
            <div className="rounded-card border border-dashed border-border px-4 py-4 text-center">
              <p className="mono-label text-label text-dim">
                TEMPLATE LIMIT REACHED ({MAX_TEMPLATES}/{MAX_TEMPLATES})
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Delete one to make room for a new template.
              </p>
            </div>
          ) : (
            <Link href="/templates/new" className={dashedAddStyles}>
              <Plus weight="bold" className="size-4" />
              <span className="mono-label text-xs">NEW TEMPLATE</span>
            </Link>
          )}
        </div>
      )}

      {/* Delete confirmation */}
      {pendingDelete && (
        <Modal
          open
          onClose={() => !deleting && setPendingDelete(null)}
          title="Delete template?"
          footer={
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setPendingDelete(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          }
        >
          <p className="text-sm leading-relaxed text-muted-foreground">
            &ldquo;{pendingDelete.name}&rdquo; will be removed. Your logged
            workouts are not affected.
          </p>
        </Modal>
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
          className="h-32 animate-pulse rounded-card border border-border bg-card"
        />
      ))}
    </div>
  );
}
