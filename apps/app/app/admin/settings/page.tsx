"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/form-controls";
import { Megaphone } from "@phosphor-icons/react";
import { useToast } from "@/components/ui/toast";

export default function AdminSettings() {
  const config = useQuery(api.config.get, {});
  const setBanner = useMutation(api.config.setBanner);
  const toast = useToast();

  const [text, setText] = useState("");
  const [active, setActive] = useState(false);
  const [saving, setSaving] = useState(false);

  // Seed the form once config loads.
  useEffect(() => {
    if (config !== undefined) {
      setText(config?.bannerText ?? "");
      setActive(config?.bannerActive ?? false);
    }
  }, [config]);

  async function save() {
    setSaving(true);
    try {
      await setBanner({
        bannerText: text.trim() || undefined,
        bannerActive: active && !!text.trim(),
      });
      toast("Banner updated", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not save", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <PageHeader eyebrow="Site config" title="Settings" />

      <Card className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2">
          <Megaphone weight="fill" className="size-4 text-accent" />
          <h2 className="font-display text-base font-extrabold">
            Announcement banner
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Shows a dismissible banner at the top of the app for every user.
        </p>

        <Field label="Banner text">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="New: workout templates are here!"
          />
        </Field>

        <div className="flex items-center justify-between gap-4 rounded-field border border-border bg-surface-3 px-4 py-3">
          <p className="text-sm font-semibold">Show banner</p>
          <Switch on={active} onClick={() => setActive((v) => !v)} />
        </div>

        {/* Live preview */}
        {active && text.trim() && (
          <div className="flex items-center gap-3 rounded-field border border-accent/30 bg-accent/10 px-4 py-2.5 text-sm">
            <Megaphone weight="fill" className="size-4 shrink-0 text-accent" />
            <span className="min-w-0 flex-1">{text}</span>
          </div>
        )}

        <Button onClick={save} disabled={saving} className="self-start">
          {saving ? "Saving…" : "Save banner"}
        </Button>
      </Card>
    </div>
  );
}
