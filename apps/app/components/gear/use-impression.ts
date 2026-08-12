"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

// Session-level dedupe so scrolling the same recommendation in and out of view
// (or re-rendering) never double-counts an impression. Keyed by source+id.
const seenThisSession = new Set<string>();

// Records an impression for the given products the first time the element they
// live in becomes visible on screen (IntersectionObserver). Batched into one
// mutation call.
export function useImpression(
  ref: RefObject<HTMLElement | null>,
  linkIds: Id<"affiliateLinks">[],
  source: string,
) {
  const recordImpression = useMutation(api.affiliate.recordImpression);
  const firedRef = useRef(false);
  const key = linkIds.join(",");

  useEffect(() => {
    const element = ref.current;
    if (!element || linkIds.length === 0 || firedRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        firedRef.current = true;
        observer.disconnect();
        const unseen = linkIds.filter(
          (id) => !seenThisSession.has(`${source}:${id}`),
        );
        if (unseen.length === 0) return;
        unseen.forEach((id) => seenThisSession.add(`${source}:${id}`));
        recordImpression({ linkIds: unseen, source }).catch(() => {});
      },
      { threshold: 0.3 },
    );
    observer.observe(element);
    return () => observer.disconnect();
    // `key` captures the linkIds set; ref/source/recordImpression are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, source]);
}
