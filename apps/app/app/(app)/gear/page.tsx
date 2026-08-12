import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { buildAffiliateUrl } from "@/lib/shop";
import { PageHeader } from "@/components/ui/page-header";
import { ProductCard, type RecoProduct } from "@/components/gear/product-card";
import { GearRecommendations } from "@/components/gear/gear-recommendations";

// The Gear page: personalized "Recommended for you" on top, then the full
// catalog by category. Affiliate links are admin-managed in Convex; outbound
// clicks route through /api/go for tracking. Dynamic so it always reflects the
// latest admin changes (and never fetches Convex at build time).
export const dynamic = "force-dynamic";

const PAGE_TITLE = "Gear — kit we rate";
const PAGE_DESCRIPTION =
  "Hand-picked lifting and training gear — belts, wraps, straps, recovery tools and more. Curated by Liftify.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
};

type GearLink = {
  _id: string;
  title: string;
  category: string;
  blurb?: string;
  image?: string;
  asin?: string;
  url?: string;
};

function buildJsonLd(links: GearLink[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Liftify Gear",
    itemListElement: links.map((link, index) => {
      const href = buildAffiliateUrl(link);
      return {
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Product",
          name: link.title,
          category: link.category,
          ...(link.image ? { image: link.image } : {}),
          ...(href
            ? {
                offers: {
                  "@type": "Offer",
                  url: href,
                  availability: "https://schema.org/InStock",
                },
              }
            : {}),
        },
      };
    }),
  };
}

// Map a catalog link → the card shape, with a tracked click URL.
function toCard(link: GearLink): RecoProduct {
  return {
    _id: link._id,
    name: link.title,
    description: link.blurb ?? null,
    image: link.image ?? null,
    clickUrl: `/api/go/${link._id}?source=gear_page`,
  };
}

export default async function GearPage() {
  const links = (await fetchQuery(api.affiliate.listActive, {})) as GearLink[];
  const categories = [...new Set(links.map((link) => link.category))];

  return (
    <div className="container-page flex flex-col gap-8 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(links)) }}
      />

      <div className="flex flex-col gap-2">
        <PageHeader eyebrow="Kit we rate" title="Gear" />
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Gear picked to match how you train. As an Amazon Associate, Liftify
          earns from qualifying purchases — at no extra cost to you.
        </p>
      </div>

      {/* Personalized — driven by workout history + goal. */}
      <GearRecommendations
        source="gear_page"
        limit={6}
        title="Recommended for you"
      />

      {categories.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nothing here yet — check back soon.
        </p>
      )}

      {categories.map((category) => {
        const inCategory = links.filter((link) => link.category === category);
        return (
          <section key={category} className="flex flex-col gap-3">
            <h2 className="mono-label text-label-lg text-muted-foreground">
              {category}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {inCategory.map((link) => (
                <ProductCard key={link._id} product={toCard(link)} />
              ))}
            </div>
          </section>
        );
      })}

      <p className="border-t border-border pt-6 text-xs text-muted-foreground">
        As an Amazon Associate, Liftify earns from qualifying purchases. Prices
        and availability are shown on Amazon and may change.
      </p>
    </div>
  );
}
