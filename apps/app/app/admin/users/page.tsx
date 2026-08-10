"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { MagnifyingGlass, Users } from "@phosphor-icons/react";
import { shortDate } from "@/lib/date";

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const users = useQuery(api.admin.listUsers, { search: search || undefined });
  const setRole = useMutation(api.admin.setRole);
  const deleteUser = useMutation(api.admin.deleteUserData);
  const toast = useToast();
  const [pendingDelete, setPendingDelete] = useState<{
    id: Id<"users">;
    email: string;
  } | null>(null);

  async function toggleRole(id: Id<"users">, current: string) {
    const next = current === "admin" ? "user" : "admin";
    try {
      await setRole({ userId: id, role: next });
      toast(next === "admin" ? "Promoted to admin" : "Demoted to user", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not update role", "error");
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await deleteUser({ userId: pendingDelete.id });
      toast("User data deleted", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not delete", "error");
    } finally {
      setPendingDelete(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={users ? `${users.length} users` : "Users"}
        title="Users"
      />

      <div className="relative">
        <MagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-dim" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email"
          className="pl-10"
        />
      </div>

      {users === undefined ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-card bg-card" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={<Users weight="fill" className="size-5" />}
          title="No users found"
          description="Try a different search."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {users.map((u) => (
            <Card key={u._id} className="flex items-center gap-3 p-3.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted font-display text-sm font-black">
                {(u.name?.[0] ?? u.email[0] ?? "?").toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-sm font-semibold">
                  {u.name ?? u.email.split("@")[0]}
                  {u.role === "admin" && <Badge tone="accent">ADMIN</Badge>}
                </p>
                <p className="truncate font-mono text-label text-muted-foreground">
                  {u.email}
                </p>
                <p className="mt-0.5 font-mono text-label text-dim">
                  {u.workouts} workouts · joined {shortDate(u.createdAt)}
                  {u.lastActive
                    ? ` · active ${shortDate(u.lastActive)}`
                    : " · never trained"}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => toggleRole(u._id, u.role)}
                >
                  {u.role === "admin" ? "Demote" : "Make admin"}
                </Button>
                <Button
                  size="sm"
                  variant="danger-outline"
                  onClick={() => setPendingDelete({ id: u._id, email: u.email })}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Delete user data?"
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
          This permanently deletes all workouts, templates, body entries and
          notifications for{" "}
          <span className="font-semibold text-foreground">
            {pendingDelete?.email}
          </span>
          , and removes their profile row. Their sign-in account is not deleted —
          they could sign in again and start fresh.
        </p>
      </Modal>
    </div>
  );
}
