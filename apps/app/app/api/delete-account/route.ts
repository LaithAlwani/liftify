import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Deletes the signed-in user's Clerk account. The caller deletes their Convex
// data first; this finalizes account removal.
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  try {
    const client = await clerkClient();
    await client.users.deleteUser(userId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Could not delete account" },
      { status: 500 },
    );
  }
}
