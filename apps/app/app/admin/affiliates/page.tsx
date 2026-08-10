"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Switch } from "@/components/ui/form-controls";
import { useToast } from "@/components/ui/toast";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
} from "recharts";
import { Plus, Storefront, Pencil, Trash } from "@phosphor-icons/react";

const VOLT = "#d7f24a";

type LinkForm = {
  title: string;
  category: string;
  blurb: string;
  price: string;
  image: string;
  asin: string;
  url: string;
};

const EMPTY_FORM: LinkForm = {
  title: "",
  category: "",
  blurb: "",
  price: "",
  image: "",
  asin: "",
  url: "",
};

export default function AdminAffiliates() {
  const links = useQuery(api.affiliate.listAll, {});
  const clicks = useQuery(api.affiliate.clicksSeries, { days: 30 });
  const create = useMutation(api.affiliate.create);
  const update = useMutation(api.affiliate.update);
  const setActive = useMutation(api.affiliate.setActive);
  const remove = useMutation(api.affiliate.remove);
  const toast = useToast();

  const [editing, setEditing] = useState<Id<"affiliateLinks"> | "new" | null>(
    null,
  );
  const [form, setForm] = useState<LinkForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Id<"affiliateLinks"> | null>(
    null,
  );

  const clickData = (clicks ?? []).map((d) => ({
    label: new Date(d.day).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    count: d.count,
  }));
  const totalClicks = (clicks ?? []).reduce((s, d) => s + d.count, 0);

  function openNew() {
    setForm(EMPTY_FORM);
    setEditing("new");
  }
  function openEdit(link: NonNullable<typeof links>[number]) {
    setForm({
      title: link.title,
      category: link.category,
      blurb: link.blurb ?? "",
      price: link.price ?? "",
      image: link.image ?? "",
      asin: link.asin ?? "",
      url: link.url ?? "",
    });
    setEditing(link._id);
  }

  async function save() {
    if (!form.title.trim() || !form.category.trim()) {
      toast("Title and category are required", "error");
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      category: form.category.trim(),
      blurb: form.blurb.trim() || undefined,
      price: form.price.trim() || undefined,
      image: form.image.trim() || undefined,
      asin: form.asin.trim() || undefined,
      url: form.url.trim() || undefined,
    };
    try {
      if (editing === "new") {
        await create(payload);
        toast("Link added (inactive)", "success");
      } else if (editing) {
        await update({ id: editing, ...payload });
        toast("Link updated", "success");
      }
      setEditing(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not save", "error");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await remove({ id: pendingDelete });
      toast("Link deleted", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not delete", "error");
    } finally {
      setPendingDelete(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Affiliate links"
        title="Affiliates"
        action={
          <Button variant="display" onClick={openNew}>
            <Plus weight="bold" className="size-4" /> Add link
          </Button>
        }
      />

      <Card className="p-4 lg:p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="mono-label text-label text-muted-foreground">
            Clicks · last 30 days
          </span>
          <span className="font-display text-lg font-black">{totalClicks}</span>
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={clickData}>
              <defs>
                <linearGradient id="clk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={VOLT} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={VOLT} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#8a8a92" }}
                interval={6}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#141417",
                  border: "1px solid #26262b",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#8a8a92" }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke={VOLT}
                strokeWidth={2}
                fill="url(#clk)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {links === undefined ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-card bg-card" />
          ))}
        </div>
      ) : links.length === 0 ? (
        <EmptyState
          icon={<Storefront weight="fill" className="size-5" />}
          title="No affiliate links yet"
          description="Add your first link — it goes live on the Shop once you toggle it active."
          action={
            <Button variant="display" onClick={openNew}>
              <Plus weight="bold" className="size-4" /> Add link
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {links
            .sort((a, b) => b.clickCount - a.clickCount)
            .map((link) => (
              <Card key={link._id} className="flex items-center gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-semibold">
                    {link.title}
                    <Badge tone="neutral">{link.category}</Badge>
                  </p>
                  <p className="mt-0.5 font-mono text-label text-dim">
                    {link.clickCount} clicks
                    {link.asin ? ` · ASIN ${link.asin}` : link.url ? " · URL" : " · no destination"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="flex flex-col items-center gap-0.5">
                    <Switch
                      on={link.active}
                      onClick={() =>
                        setActive({ id: link._id, active: !link.active })
                      }
                    />
                    <span className="mono-label text-[9px] text-dim">
                      {link.active ? "LIVE" : "OFF"}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => openEdit(link)}
                    aria-label="Edit"
                    className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Pencil weight="bold" className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(link._id)}
                    aria-label="Delete"
                    className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash weight="bold" className="size-4" />
                  </button>
                </div>
              </Card>
            ))}
        </div>
      )}

      {/* Add / edit form */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Add affiliate link" : "Edit link"}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <Field label="Title">
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Lifting belt"
            />
          </Field>
          <Field label="Category">
            <Input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Support"
            />
          </Field>
          <Field label="Blurb" helper="Optional one-liner shown on the card.">
            <Input
              value={form.blurb}
              onChange={(e) => setForm({ ...form, blurb: e.target.value })}
            />
          </Field>
          <Field
            label="Amazon ASIN"
            helper="The 10-char product ID — the associate tag is appended automatically."
          >
            <Input
              value={form.asin}
              onChange={(e) => setForm({ ...form, asin: e.target.value })}
              placeholder="B0XXXXXXXX"
            />
          </Field>
          <Field label="Full URL" helper="Overrides ASIN — used as-is if set.">
            <Input
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://…"
            />
          </Field>
          <Field label="Image URL">
            <Input
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Delete this link?"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          This removes the link from the Shop. Click history is not affected.
        </p>
      </Modal>
    </div>
  );
}
