import { NextResponse, type NextRequest } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AMAZON_TAG, AMAZON_DOMAIN } from "@/lib/shop";

// Outbound affiliate-click redirect. Records the click in Convex, then builds
// the final Amazon URL (associate tag appended here, in the Next runtime) and
// 302s to it. Falls back to /shop if the link is gone or misconfigured.
// This route is public (added to proxy.ts's allowlist) so clicks work for anyone.
function buildUrl(link: { asin: string | null; url: string | null }): string | null {
  if (link.url) return link.url; // full-URL override wins
  if (!link.asin) return null;
  const base = `https://www.${AMAZON_DOMAIN}/dp/${link.asin}`;
  return AMAZON_TAG ? `${base}?tag=${AMAZON_TAG}` : base;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> },
) {
  const { linkId } = await params;
  const fallback = new URL("/shop", request.url);
  try {
    const link = await fetchMutation(api.affiliate.resolveForRedirect, {
      linkId: linkId as Id<"affiliateLinks">,
    });
    const dest = link ? buildUrl(link) : null;
    return NextResponse.redirect(dest ? new URL(dest) : fallback);
  } catch {
    return NextResponse.redirect(fallback);
  }
}
