import { NextResponse, type NextRequest } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { buildAffiliateUrl } from "@/lib/shop";

// Outbound affiliate-click redirect. Records the click (with recommendation
// context) in Convex, then builds the final Amazon URL (associate tag appended
// here, in the Next runtime) and 302s to it. Falls back to /gear if the link is
// gone. Public route (in proxy.ts's allowlist) so clicks work signed-out.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> },
) {
  const { linkId } = await params;
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source") ?? undefined;
  const workout = searchParams.get("workout") ?? undefined;
  const exercise = searchParams.get("exercise") ?? undefined;
  const fallback = new URL("/gear", request.url);
  try {
    const link = await fetchMutation(api.affiliate.resolveForRedirect, {
      linkId: linkId as Id<"affiliateLinks">,
      source,
      workoutId: workout ? (workout as Id<"workouts">) : undefined,
      exerciseName: exercise,
    });
    const dest = link ? buildAffiliateUrl(link) : null;
    return NextResponse.redirect(dest ? new URL(dest) : fallback);
  } catch {
    return NextResponse.redirect(fallback);
  }
}
