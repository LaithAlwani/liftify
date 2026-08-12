import { v } from "convex/values";

import { internalMutation, mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { getCurrentUser, requireAdmin } from "./model";
import { deriveTags, goalTags } from "../lib/exercise-tags";
import { recommend as rankProducts, buildContext } from "../lib/recommend";

const DAY = 86_400_000;

// Build the tracked click URL with recommendation context, so /api/go can
// attribute the click to its source/workout/exercise.
function buildClickUrl(
  id: string,
  ctx: { source?: string; workoutId?: string; exerciseName?: string },
): string {
  const parts: string[] = [];
  if (ctx.source) parts.push(`source=${encodeURIComponent(ctx.source)}`);
  if (ctx.workoutId) parts.push(`workout=${encodeURIComponent(ctx.workoutId)}`);
  if (ctx.exerciseName)
    parts.push(`exercise=${encodeURIComponent(ctx.exerciseName)}`);
  return `/api/go/${id}${parts.length ? `?${parts.join("&")}` : ""}`;
}

// --- Public (drives the Shop page) ---

// Active links, ordered — the Shop page reads this. Public: no auth needed.
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const links = await ctx.db
      .query("affiliateLinks")
      .withIndex("by_active_sort", (q) => q.eq("active", true))
      .collect();
    return links.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

// Record an outbound click and return the raw destination fields. The /api/go
// route builds the final Amazon URL (appends the associate tag) and redirects,
// so the tag stays in the Next runtime env — no Convex env needed.
export const resolveForRedirect = mutation({
  args: {
    linkId: v.id("affiliateLinks"),
    source: v.optional(v.string()),
    workoutId: v.optional(v.id("workouts")),
    exerciseName: v.optional(v.string()),
  },
  handler: async (ctx, { linkId, source, workoutId, exerciseName }) => {
    const link = await ctx.db.get(linkId);
    if (!link) return null;
    const user = await getCurrentUser(ctx);
    await ctx.db.insert("clickEvents", {
      linkId,
      at: Date.now(),
      userId: user?._id,
      source,
      workoutId,
      exerciseName,
    });
    await ctx.db.patch(linkId, { clickCount: link.clickCount + 1 });
    return { asin: link.asin ?? null, url: link.url ?? null };
  },
});

// Record recommendations actually shown on screen (client dedupes per session).
export const recordImpression = mutation({
  args: {
    linkIds: v.array(v.id("affiliateLinks")),
    source: v.optional(v.string()),
  },
  handler: async (ctx, { linkIds, source }) => {
    const user = await getCurrentUser(ctx);
    const now = Date.now();
    for (const linkId of linkIds) {
      await ctx.db.insert("impressionEvents", {
        linkId,
        at: now,
        userId: user?._id,
        source,
      });
    }
  },
});

// --- Admin ---

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const links = await ctx.db.query("affiliateLinks").collect();
    return links.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    category: v.string(),
    subcategory: v.optional(v.string()),
    blurb: v.optional(v.string()),
    price: v.optional(v.string()),
    currency: v.optional(v.string()),
    image: v.optional(v.string()),
    asin: v.optional(v.string()),
    url: v.optional(v.string()),
    retailer: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    priority: v.optional(v.number()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.query("affiliateLinks").collect();
    const maxOrder = existing.reduce((m, l) => Math.max(m, l.sortOrder), 0);
    return await ctx.db.insert("affiliateLinks", {
      title: args.title,
      category: args.category,
      subcategory: args.subcategory,
      blurb: args.blurb,
      price: args.price,
      currency: args.currency ?? "CAD",
      image: args.image,
      asin: args.asin,
      url: args.url,
      retailer: args.retailer ?? "amazon",
      tags: args.tags,
      priority: args.priority ?? 0,
      active: args.active ?? false,
      sortOrder: maxOrder + 1,
      clickCount: 0,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("affiliateLinks"),
    title: v.optional(v.string()),
    category: v.optional(v.string()),
    subcategory: v.optional(v.string()),
    blurb: v.optional(v.string()),
    price: v.optional(v.string()),
    currency: v.optional(v.string()),
    image: v.optional(v.string()),
    asin: v.optional(v.string()),
    url: v.optional(v.string()),
    retailer: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    priority: v.optional(v.number()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    // Only patch provided keys so an omitted optional field isn't wiped.
    const updates: Partial<Doc<"affiliateLinks">> = {};
    if (fields.title !== undefined) updates.title = fields.title;
    if (fields.category !== undefined) updates.category = fields.category;
    if (fields.subcategory !== undefined) updates.subcategory = fields.subcategory;
    if (fields.blurb !== undefined) updates.blurb = fields.blurb;
    if (fields.price !== undefined) updates.price = fields.price;
    if (fields.currency !== undefined) updates.currency = fields.currency;
    if (fields.image !== undefined) updates.image = fields.image;
    if (fields.asin !== undefined) updates.asin = fields.asin;
    if (fields.url !== undefined) updates.url = fields.url;
    if (fields.retailer !== undefined) updates.retailer = fields.retailer;
    if (fields.tags !== undefined) updates.tags = fields.tags;
    if (fields.priority !== undefined) updates.priority = fields.priority;
    if (fields.sortOrder !== undefined) updates.sortOrder = fields.sortOrder;
    await ctx.db.patch(id, updates);
  },
});

// The "deploy" toggle — flips a link on/off on the Shop page instantly.
export const setActive = mutation({
  args: { id: v.id("affiliateLinks"), active: v.boolean() },
  handler: async (ctx, { id, active }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, { active });
  },
});

export const remove = mutation({
  args: { id: v.id("affiliateLinks") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(id);
  },
});

// Per-day click counts across a window (default 30d), for the performance chart.
export const clicksSeries = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days }) => {
    await requireAdmin(ctx);
    const windowDays = days ?? 30;
    const since = Date.now() - windowDays * DAY;
    const events = await ctx.db.query("clickEvents").collect();
    const recent = events.filter((e) => e.at >= since);
    const first = Math.floor(since / DAY);
    const counts = new Array<number>(windowDays + 1).fill(0);
    for (const e of recent) {
      const idx = Math.floor(e.at / DAY) - first;
      if (idx >= 0 && idx < counts.length) counts[idx] += 1;
    }
    return counts.map((count, i) => ({ day: (first + i) * DAY, count }));
  },
});

// One-off: seed the table from the old static SHOP_PRODUCTS array (run once via
// `npx convex run affiliate:importFromStatic '{ "items": [...] }'`), then retire
// lib/shop.ts. New links come in inactive so nothing goes live unintentionally.
export const importFromStatic = internalMutation({
  args: {
    items: v.array(
      v.object({
        title: v.string(),
        category: v.string(),
        blurb: v.optional(v.string()),
        price: v.optional(v.string()),
        image: v.optional(v.string()),
        asin: v.optional(v.string()),
        url: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { items }) => {
    let order = 0;
    for (const item of items) {
      await ctx.db.insert("affiliateLinks", {
        ...item,
        active: false,
        sortOrder: order++,
        clickCount: 0,
        createdAt: Date.now(),
      });
    }
    return { inserted: items.length };
  },
});

// --- Recommendations (public) ---

// Contextual gear recommendations. Deterministic + tag-based (see lib/recommend
// + lib/exercise-tags). Returns slim products with a tracked `clickUrl` (never
// the raw affiliate URL). Fast: only the exercise names in play are resolved to
// tags (indexed by_name, cached), not the whole 873-row library.
export const recommend = query({
  args: {
    source: v.optional(v.string()),
    workoutId: v.optional(v.id("workouts")),
    exerciseName: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { source, workoutId, exerciseName, limit }) => {
    const user = await getCurrentUser(ctx);

    // Resolve an exercise name → derived tags, via the indexed library with a
    // per-call cache and a name-keyword fallback for custom exercises.
    const tagCache = new Map<string, string[]>();
    async function tagsForName(name: string): Promise<string[]> {
      const key = name.toLowerCase();
      const cached = tagCache.get(key);
      if (cached) return cached;
      const exercise = await ctx.db
        .query("exercises")
        .withIndex("by_name", (q) => q.eq("name", name))
        .first();
      const tags = exercise ? deriveTags(exercise) : deriveTags({ name });
      tagCache.set(key, tags);
      return tags;
    }

    const exerciseTags = new Set<string>();
    const workoutTags = new Set<string>();

    if (exerciseName) {
      for (const tag of await tagsForName(exerciseName)) exerciseTags.add(tag);
    }
    if (workoutId) {
      const workout = await ctx.db.get(workoutId);
      if (workout) {
        for (const exercise of workout.exercises) {
          for (const tag of await tagsForName(exercise.name)) {
            exerciseTags.add(tag);
            workoutTags.add(tag);
          }
        }
      }
    }

    const clickedCategories = new Set<string>();
    if (user) {
      // Recent training biases the broader workout tags.
      const recent = await ctx.db
        .query("workouts")
        .withIndex("by_user_date", (q) => q.eq("userId", user._id))
        .order("desc")
        .take(15);
      for (const workout of recent) {
        for (const exercise of workout.exercises) {
          for (const tag of await tagsForName(exercise.name)) workoutTags.add(tag);
        }
      }
      // Categories the user has clicked before (behavioral weighting).
      const clicks = await ctx.db
        .query("clickEvents")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();
      const categoryByLink = new Map<string, string | null>();
      for (const click of clicks) {
        let category = categoryByLink.get(click.linkId);
        if (category === undefined) {
          const link = await ctx.db.get(click.linkId);
          category = link?.category ?? null;
          categoryByLink.set(click.linkId, category);
        }
        if (category) clickedCategories.add(category);
      }
    }

    const products = await ctx.db
      .query("affiliateLinks")
      .withIndex("by_active_sort", (q) => q.eq("active", true))
      .collect();

    const context = buildContext({
      exerciseTags: [...exerciseTags],
      workoutTags: [...workoutTags],
      goalTags: goalTags(user?.fitnessGoal),
      clickedCategories: [...clickedCategories],
    });
    const ranked = rankProducts(products, context, limit ?? 4);

    return ranked.map((product) => ({
      _id: product._id,
      name: product.title,
      description: product.blurb ?? null,
      category: product.category,
      image: product.image ?? null,
      price: product.price ?? null,
      retailer: product.retailer ?? "amazon",
      clickUrl: buildClickUrl(product._id, { source, workoutId, exerciseName }),
    }));
  },
});

// --- Admin analytics ---

// Per-product impressions / clicks / CTR (all-time), most-clicked first.
export const productStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const products = await ctx.db.query("affiliateLinks").collect();
    const clicks = await ctx.db.query("clickEvents").collect();
    const impressions = await ctx.db.query("impressionEvents").collect();

    const clicksByLink = new Map<string, number>();
    for (const c of clicks)
      clicksByLink.set(c.linkId, (clicksByLink.get(c.linkId) ?? 0) + 1);
    const imprByLink = new Map<string, number>();
    for (const i of impressions)
      imprByLink.set(i.linkId, (imprByLink.get(i.linkId) ?? 0) + 1);

    return products
      .map((p) => {
        const impr = imprByLink.get(p._id) ?? 0;
        const clk = clicksByLink.get(p._id) ?? 0;
        return {
          _id: p._id,
          title: p.title,
          category: p.category,
          active: p.active,
          impressions: impr,
          clicks: clk,
          ctr: impr > 0 ? clk / impr : 0,
        };
      })
      .sort((a, b) => b.clicks - a.clicks);
  },
});

// Clicks / impressions / CTR broken down by recommendation source.
export const sourceStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const clicks = await ctx.db.query("clickEvents").collect();
    const impressions = await ctx.db.query("impressionEvents").collect();
    const bySource = new Map<string, { clicks: number; impressions: number }>();
    const bump = (source: string | undefined, key: "clicks" | "impressions") => {
      const s = source || "direct";
      const cur = bySource.get(s) ?? { clicks: 0, impressions: 0 };
      cur[key] += 1;
      bySource.set(s, cur);
    };
    for (const c of clicks) bump(c.source, "clicks");
    for (const i of impressions) bump(i.source, "impressions");
    return [...bySource.entries()]
      .map(([source, v]) => ({
        source,
        clicks: v.clicks,
        impressions: v.impressions,
        ctr: v.impressions > 0 ? v.clicks / v.impressions : 0,
      }))
      .sort((a, b) => b.clicks - a.clicks);
  },
});

// --- Seed ~30 gear products (idempotent by title) ---
// Run once: `npx convex run affiliate:seedGear`. URLs are Amazon.ca search
// placeholders — replace with real product (ASIN) links in admin to earn the tag.
const GEAR_SEED: {
  title: string;
  category: string;
  subcategory: string;
  tags: string[];
  priority?: number;
}[] = [
  // Equipment
  { title: "Resistance Bands Set", category: "Equipment", subcategory: "Bands", tags: ["home", "bands", "bodyweight", "mobility"], priority: 2 },
  { title: "Adjustable Dumbbells", category: "Equipment", subcategory: "Weights", tags: ["dumbbell", "home", "strength", "muscle"], priority: 3 },
  { title: "Kettlebell", category: "Equipment", subcategory: "Weights", tags: ["kettlebell", "home", "strength"] },
  { title: "Jump Rope", category: "Equipment", subcategory: "Cardio", tags: ["cardio", "home", "running"], priority: 1 },
  { title: "Pull-Up Bar", category: "Equipment", subcategory: "Bodyweight", tags: ["pull-up", "pull", "back", "home", "bodyweight"], priority: 1 },
  { title: "Ab Wheel", category: "Equipment", subcategory: "Core", tags: ["core", "abs", "home", "bodyweight"] },
  { title: "Exercise Mat", category: "Equipment", subcategory: "Mat", tags: ["home", "mobility", "recovery", "bodyweight"] },
  // Lifting & Support
  { title: "Weightlifting Belt", category: "Lifting", subcategory: "Support", tags: ["squat", "deadlift", "lower-body", "powerlifting", "strength", "support"], priority: 3 },
  { title: "Wrist Wraps", category: "Lifting", subcategory: "Support", tags: ["bench", "press", "push", "wrist", "support", "strength"], priority: 2 },
  { title: "Lifting Straps", category: "Lifting", subcategory: "Support", tags: ["deadlift", "pull", "back", "grip", "strength", "support"], priority: 3 },
  { title: "Lifting Gloves", category: "Lifting", subcategory: "Support", tags: ["grip", "support", "barbell", "dumbbell"] },
  { title: "Knee Sleeves", category: "Lifting", subcategory: "Support", tags: ["squat", "legs", "lower-body", "support", "strength"], priority: 2 },
  { title: "Elbow Sleeves", category: "Lifting", subcategory: "Support", tags: ["bench", "press", "push", "support"] },
  { title: "Barbell Pad", category: "Lifting", subcategory: "Accessory", tags: ["glutes", "legs", "support"] },
  // Recovery
  { title: "Foam Roller", category: "Recovery", subcategory: "Mobility", tags: ["recovery", "mobility"], priority: 2 },
  { title: "Massage Ball", category: "Recovery", subcategory: "Mobility", tags: ["recovery", "mobility"] },
  { title: "Stretching Strap", category: "Recovery", subcategory: "Mobility", tags: ["recovery", "mobility", "home"] },
  { title: "Mobility Bands", category: "Recovery", subcategory: "Mobility", tags: ["recovery", "mobility", "bands", "home"] },
  // Gym Essentials
  { title: "Shaker Bottle", category: "Essentials", subcategory: "Nutrition", tags: ["strength", "muscle"] },
  { title: "Water Bottle", category: "Essentials", subcategory: "Hydration", tags: ["cardio", "home"] },
  { title: "Gym Bag", category: "Essentials", subcategory: "Bag", tags: ["strength"] },
  { title: "Gym Towel", category: "Essentials", subcategory: "Accessory", tags: [] },
  { title: "Phone Holder", category: "Essentials", subcategory: "Accessory", tags: ["cardio", "home"] },
  { title: "Wireless Headphones", category: "Essentials", subcategory: "Audio", tags: ["cardio", "running"] },
  // Apparel
  { title: "Workout Shirt", category: "Apparel", subcategory: "Tops", tags: [] },
  { title: "Tank Top", category: "Apparel", subcategory: "Tops", tags: [] },
  { title: "Training Shorts", category: "Apparel", subcategory: "Bottoms", tags: [] },
  { title: "Joggers", category: "Apparel", subcategory: "Bottoms", tags: [] },
  { title: "Training Shoes", category: "Apparel", subcategory: "Footwear", tags: ["strength", "legs"] },
  { title: "Running Shoes", category: "Apparel", subcategory: "Footwear", tags: ["cardio", "running"], priority: 1 },
];

export const seedGear = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("affiliateLinks").collect();
    const existingTitles = new Set(existing.map((l) => l.title.toLowerCase()));
    let order = existing.reduce((m, l) => Math.max(m, l.sortOrder), 0);
    let inserted = 0;
    for (const gear of GEAR_SEED) {
      if (existingTitles.has(gear.title.toLowerCase())) continue;
      await ctx.db.insert("affiliateLinks", {
        title: gear.title,
        category: gear.category,
        subcategory: gear.subcategory,
        tags: gear.tags,
        retailer: "amazon",
        currency: "CAD",
        url: `https://www.amazon.ca/s?k=${encodeURIComponent(gear.title)}`,
        priority: gear.priority ?? 0,
        active: true,
        sortOrder: ++order,
        clickCount: 0,
        createdAt: Date.now(),
      });
      inserted += 1;
    }
    return { inserted, skipped: GEAR_SEED.length - inserted };
  },
});
