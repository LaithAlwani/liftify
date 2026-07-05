// Shared, non-public helpers (not Convex functions — just utilities the
// query/mutation modules import).
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

export async function getCurrentUserOrThrow(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error("User row missing — call users.getOrCreateCurrentUser first");
  }
  return user;
}

// For write paths: return the user row, creating it if the authenticated user
// has none yet. Avoids racing the on-load ensure step.
export async function getOrCreateUser(
  ctx: MutationCtx,
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");

  const existing = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (existing) return existing;

  const now = Date.now();
  const id = await ctx.db.insert("users", {
    clerkId: identity.subject,
    email: identity.email ?? "",
    firstName: identity.givenName ?? undefined,
    lastName: identity.familyName ?? undefined,
    units: "lb",
    createdAt: now,
  });
  const created = await ctx.db.get(id);
  if (!created) throw new Error("Failed to create user");
  return created;
}

// Liftify is free — everyone has full access.
export function hasAccess(_user: Doc<"users">, _now: number): boolean {
  return true;
}

export function requireAccess(_user: Doc<"users">, _now: number): void {
  // Free app — nothing to gate.
}
