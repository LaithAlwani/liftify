"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Spinner } from "@/components/ui/spinner";
import { AdminShell } from "@/components/admin/admin-shell";

// Client gate: role check is server-authoritative in every admin function, but
// this redirects non-admins for UX. `undefined` = still loading.
export default function AdminLayout({ children }: { children: ReactNode }) {
  const isAdmin = useQuery(api.admin.isAdmin);
  const router = useRouter();

  useEffect(() => {
    if (isAdmin === false) router.replace("/");
  }, [isAdmin, router]);

  if (isAdmin === undefined) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }
  if (!isAdmin) return null;

  return <AdminShell>{children}</AdminShell>;
}
