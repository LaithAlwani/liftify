"use client";

import { useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ProductCard } from "./product-card";
import { useImpression } from "./use-impression";

// Contextual gear recommendations, reused everywhere (gear page, workout
// complete, exercise cards, goal). Fetches from api.affiliate.recommend, renders
// ProductCards, and records an impression when it scrolls into view. Renders
// nothing when there are no relevant products — recommendations never nag.
export function GearRecommendations({
  source,
  workoutId,
  exerciseName,
  limit = 4,
  title,
  compact = false,
  className = "",
}: {
  source: string;
  workoutId?: Id<"workouts">;
  exerciseName?: string;
  limit?: number;
  title?: string;
  compact?: boolean;
  className?: string;
}) {
  const products = useQuery(api.affiliate.recommend, {
    source,
    workoutId,
    exerciseName,
    limit,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const ids = (products ?? []).map((p) => p._id as Id<"affiliateLinks">);
  useImpression(containerRef, ids, source);

  if (!products || products.length === 0) return null;

  return (
    <div ref={containerRef} className={`flex flex-col gap-2 ${className}`.trim()}>
      {title && (
        <p className="mono-label text-label text-muted-foreground">{title}</p>
      )}
      {compact ? (
        <div className="flex flex-col gap-2">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} compact />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
