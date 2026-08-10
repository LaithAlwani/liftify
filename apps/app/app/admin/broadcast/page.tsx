"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/form-controls";
import { useToast } from "@/components/ui/toast";

export default function AdminBroadcast() {
  const broadcast = useMutation(api.admin.broadcastNotification);
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [alsoPush, setAlsoPush] = useState(false);
  const [sending, setSending] = useState(false);

  async function send() {
    if (!title.trim() || !body.trim()) {
      toast("Title and message are required", "error");
      return;
    }
    setSending(true);
    try {
      const res = await broadcast({
        title: title.trim(),
        body: body.trim(),
        url: url.trim() || undefined,
        alsoPush,
      });
      toast(`Sent to ${res.notified} users`, "success");
      setTitle("");
      setBody("");
      setUrl("");
      setAlsoPush(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not send", "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <PageHeader eyebrow="Announcements" title="Broadcast" />

      <Card className="flex flex-col gap-4 p-5">
        <Field label="Title">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New feature: workout templates"
          />
        </Field>
        <Field label="Message">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Save your go-to days and start in one tap."
            className="w-full rounded-field border border-border bg-surface-3 px-3.5 py-2.5 text-sm text-foreground placeholder:text-dim focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </Field>
        <Field label="Link" helper="Optional — where tapping the notification goes.">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="/templates"
          />
        </Field>
        <div className="flex items-center justify-between gap-4 rounded-field border border-border bg-surface-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Also send push</p>
            <p className="text-xs text-muted-foreground">
              Reaches users with push enabled, even when the app is closed.
            </p>
          </div>
          <Switch on={alsoPush} onClick={() => setAlsoPush((v) => !v)} />
        </div>
        <Button onClick={send} disabled={sending} className="self-start">
          {sending ? "Sending…" : "Send to all users"}
        </Button>
      </Card>
    </div>
  );
}
